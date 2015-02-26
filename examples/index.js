var Hapi = require('hapi'),
	SimpleSession = require('../'),
	server = new Hapi.Server(process.env.PORT || 8080, {
/*
		cache: {
			engine: require('catbox-memcached'),
			port: 11211,
			// engine: require('catbox-redis'),
			// port: 6379,
			host: '192.168.10.10'
		}
*/
	});

server.register({
	plugin: SimpleSession,
	options: {
		name: 'session', // override session ID cookie name
		cache: {
			expiresIn: 3600 * 1000
		}
	}
}, function(err) {
	if (err) {
		console.log(err)
		throw err;
	}
});

server.route({
	method: 'GET',
	path: '/',
	config: {
		handler: function(request, reply) {
			reply(request.session._store);
		}
	}
});
server.route({
	method: 'GET',
	path: '/set',
	config: {
		handler: function(request, reply) {
			request.session.set('test', 1);
			reply.redirect('/');
		}
	}
});
server.route({
	method: 'GET',
	path: '/set/{key}/{value}',
	config: {
		handler: function(request, reply) {
			request.session.set(request.params.key, request.params.value);
			reply.redirect('/');
		}
	}
});
server.route({
	method: 'GET',
	path: '/clear',
	config: {
		handler: function(request, reply) {
			request.session.reset();
			reply.redirect('/');
		}
	}
});

server.start(function() {
	console.log('Server started at: ', server.info.uri);
});
