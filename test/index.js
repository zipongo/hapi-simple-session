var Lab = require('lab'),
	Hapi = require('hapi'),
	Boom = require('boom'),
	subject = require('../'),
	lab = exports.lab = Lab.script(),
	expect = Lab.expect,
	before = lab.beforeEach,
	after = lab.after,
	describe = lab.experiment,
	it = lab.it,
	server;

function getCookie(res) {
	var match = res.headers['set-cookie'][0].match(/(sid=[0-9a-f\-]+)/);
	return match ? match[1] : null;
}

describe('hapi-simple-session', function() {
	before(function(done) {
		server = new Hapi.Server(0);
		done();
	});

	it('sets session value then gets it back (default options)', function(done) {
		server.route([
			{
				method: 'GET',
				path: '/1',
				handler: function(request, reply) {
					request.session.set('some', { value: '2' });
					request.session.set('one', 'xyz');
					request.session.clear('one');
					return reply(Object.keys(request.session._store).length);
				}
			},
			{
				method: 'GET',
				path: '/2',
				handler: function(request, reply) {
					var some = request.session.get('some');
					some.raw = 'access';
					request.session.touch();
					return reply(some.value);
				}
			},
			{
				method: 'GET',
				path: '/3',
				handler: function(request, reply) {
					var raw = request.session.get('some').raw;
					request.session.reset();
					return reply(raw);
				}
			}
		]);

		server.pack.register({
			plugin: subject
		}, function(err) {
			expect(err).to.not.exist;
			server.start(function() {
				server.inject({ method: 'GET', url: '/1' }, function(res) {
					var header, cookie;

					expect(res.result).to.equal(1);

					header = res.headers['set-cookie'];
					expect(header.length).to.equal(1);
					expect(header[0]).to.not.contain('Secure');
					cookie = getCookie(res);

					server.inject({
						method: 'GET',
						url: '/2',
						headers: {
							cookie: cookie
						}
					}, function(res2) {
						var cookie2 = getCookie(res2);

						expect(res2.result).to.equal('2');

						server.inject({
							method: 'GET',
							url: '/3',
							headers: {
								cookie: cookie2
							}
						}, function(res3) {
							expect(res3.result).to.equal('access');

							done();
						});
					});
				});
			});
		});
	});

	it('sets session value and wait till cache expires then fail to get it back', function(done) {
		server.route([
			{
				method: 'GET',
				path: '/1',
				handler: function(request, reply) {
					request.session.set('some', { value: '2' });
					request.session.set('one', 'xyz');
					request.session.clear('one');
					return reply(Object.keys(request.session._store).length);
				}
			},
			{
				method: 'GET',
				path: '/2',
				handler: function(request, reply) {
					var some = request.session.get('some');
					return reply(some);
				}
			}
		]);

		server.pack.register({
			plugin: subject,
			options: {
				cache: {
					expiresIn: 1
				}
			}
		}, function(err) {
			expect(err).to.not.exist;
			server.start(function() {
				server.inject({
					method: 'GET',
					url: '/1'
				}, function(res) {
					var header, cookie;

					expect(res.result).to.equal(1);
					header = res.headers['set-cookie'];
					expect(header.length).to.equal(1);
					expect(header[0]).to.not.contain('Secure');
					cookie = getCookie(res);

					setTimeout(function() {
						server.inject({
							method: 'GET',
							url: '/2',
							headers: {
								cookie: cookie
							}
						}, function(res2) {
							expect(res2.result).to.equal(null);

							done();
						});
					}, 10);
				});
			});
		});
	});

	it('sets session value then gets it back (clear)', function(done) {
		server.route([
			{
				method: 'GET',
				path: '/1',
				handler: function(request, reply) {
					request.session.set({'some': '2'});
					return reply('1');
				}
			},
			{
				method: 'GET',
				path: '/2',
				handler: function(request, reply) {
					var some = request.session.get('some', true);
					return reply(some);
				}
			},
			{
				method: 'GET',
				path: '/3',
				handler: function(request, reply) {
					var some = request.session.get('some');
					return reply(some || '3');
				}
			}
		]);

		server.pack.register({
			plugin: subject
		}, function(err) {
			expect(err).to.not.exist;
			server.start(function() {
				server.inject({
					method: 'GET',
					url: '/1'
				}, function(res) {
					var cookie;

					expect(res.result).to.equal('1');
					cookie = getCookie(res);

					server.inject({
						method: 'GET',
						url: '/2',
						headers: {
							cookie: cookie
						}
					}, function(res2) {
						var cookie2;

						expect(res2.result).to.equal('2');
						cookie2 = getCookie(res2);

						server.inject({
							method: 'GET',
							url: '/3',
							headers: {
								cookie: cookie2
							}
						}, function(res3) {
							expect(res3.result).to.equal('3');
							done();
						});
					});
				});
			});
		});
	});

	it('fails to initialize session on invalid cache', function(done) {
		server.route([
			{
				method: 'GET',
				path: '/1',
				handler: function(request, reply) {
					request.session.set('some', { value: '2' });
					return reply('1');
				}
			},
			{
				method: 'GET',
				path: '/2',
				handler: function(request, reply) {
					return reply(request.session.get('some').value);
				}
			}
		]);

		server.pack.register({
			plugin: subject
		}, function(err) {
			expect(err).to.not.exist;
			server.start(function() {
				server.inject({
					method: 'GET',
					url: '/1'
				}, function(res) {
					var cookie = getCookie(res);

					server.pack._caches._default.client.stop();

					server.inject({
						method: 'GET',
						url: '/2',
						headers: {
							cookie: cookie
						}
					}, function(res2) {
						expect(res2.statusCode).to.equal(500);

						done();
					});
				});
			});
		});
	});

	it('fails setting session key/value because of bad key/value arguments', function(done) {
		server = new Hapi.Server(0, {
			debug: false
		});

		server.route([
			{
				method: 'GET',
				path: '/1',
				handler: function(request, reply) {
					request.session.set({ 'some': '2' }, '2');
					return reply('1');
				}
			},
			{
				method: 'GET',
				path: '/2',
				handler: function(request, reply) {
					request.session.set(45.68, '2');
					return reply('1');
				}
			}
		]);

		server.pack.register({
			plugin: subject
		}, function(err) {
			expect(err).to.not.exist;
			server.start(function() {
				server.inject({
					method: 'GET',
					url: '/1'
				}, function(res) {
					expect(res.statusCode).to.equal(500);

					server.inject({
						method: 'GET',
						url: '/2'
					}, function(res2) {
						expect(res2.statusCode).to.equal(500);
						done();
					});
				});
			});
		});
	});

	it('ignores requests when session is not set (error)', function(done) {
		server.route({
			method: 'GET',
			path: '/',
			handler: function(request, reply) {
				reply('ok');
			}
		});

		server.ext('onRequest', function(request, reply) {
			reply(Boom.badRequest('handler error'));
		});

		server.pack.register({
			plugin: subject
		}, function(err) {
			expect(err).to.not.exist;
			server.start(function() {
				server.inject('/', function(res) {
					expect(res.statusCode).to.equal(400);
					expect(res.result.message).to.equal('handler error');
					done();
				});
			});
		});
	});

	describe("#flash", function() {
		it('should get all flash messages when given no arguments', function(done) {
			server.route([
				{
					method: 'GET',
					path: '/1',
					config: {
						handler: function(request, reply) {
							request.session.flash('error', 'test error 1');
							request.session.flash('error', 'test error 2');
							request.session.flash('test', 'test 1', true);
							request.session.flash('test', 'test 2', true);
							reply(request.session._store);
						}
					}
				},
				{
					method: 'GET',
					path: '/2',
					config: {
						handler: function(request, reply) {
							var flashes = request.session.flash();
							reply({
								session: request.session._store,
								flashes: flashes
							});
						}
					}
				}
			]);

			server.pack.register({
				plugin: subject
			}, function(err) {
				expect(err).to.not.exist;
				server.start(function(err) {
					server.inject({
						method: 'GET',
						url: '/1'
					}, function(res) {
						var header, cookie;

						expect(res.result._flash.error).to.deep.equal([
							'test error 1',
							'test error 2'
						]);
						expect(res.result._flash.test).to.deep.equal('test 2');

						header = res.headers['set-cookie'];
						expect(header.length).to.equal(1);
						cookie = getCookie(res);

						server.inject({
							method: 'GET',
							url: '/2',
							headers: {
								cookie: cookie
							}
						}, function(res2) {
							expect(res2.result.session._flash.error).to.not.exist;
							expect(res2.result.flashes).to.exist;
							done();
						});
					});
				});
			});
		});

		it('should delete on read', function(done) {
			server.route([
				{
					method: 'GET',
					path: '/1',
					config: {
						handler: function(request, reply) {
							request.session.flash('error', 'test error');
							reply(request.session._store);
						}
					}
				},
				{
					method: 'GET',
					path: '/2',
					config: {
						handler: function(request, reply) {
							var errors = request.session.flash('error');
							var nomsg = request.session.flash('nomsg');
							reply({
								session: request.session._store,
								errors: errors,
								nomsg: nomsg
							});
						}
					}
				}
			]);

			server.pack.register({
				plugin: subject
			}, function(err) {
				expect(err).to.not.exist;
				server.start(function(err) {
					server.inject({
						method: 'GET',
						url: '/1'
					}, function(res) {
						var header, cookie;

						expect(res.result._flash.error).to.exist;
						expect(res.result._flash.error.length).to.be.above(0);

						header = res.headers['set-cookie'];
						expect(header.length).to.equal(1);
						cookie = getCookie(res);

						server.inject({
							method: 'GET',
							url: '/2',
							headers: {
								cookie: cookie
							}
						}, function(res2) {
							expect(res2.result.session._flash.error).to.not.exist;
							expect(res2.result.errors).to.exist;
							expect(res2.result.nomsg).to.exist;
							done();
						});
					});
				});
			});
		});
	});
});
