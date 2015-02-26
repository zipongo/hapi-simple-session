var Hoek = require('hoek'),
	Uuid = require('node-uuid'),
	internals = {};

internals.defaults = {
	name: 'sid',
	cache: {
		expiresIn: 24 * 60 * 60 * 1000
	},
	cookieOptions: {
		path: '/'
	}
};

exports.register = function(plugin, options, next) {
	var settings = Hoek.applyToDefaults(internals.defaults, options),
		startTime = Date.now(),
		cache = plugin.cache(settings.cache);

	// Configure session cookie
	plugin.state(settings.name, settings.cookieOptions);

	// Cache the session store
	var doStore = function(request, callback) {
		cache.set(request.session.id, request.session._store, 0, function(err) {
			if (!err) {
				request.session._isModified = false;
			}
			callback(err);
		});
	};

	// Pre auth
	plugin.ext('onPreAuth', function(request, reply) {
		var decorate = function(err) {
				request.session.reset = function() {
					cache.drop(request.session.id, function(err) { });
					request.session.id = Uuid.v4();
					request.session._store = {};
					request.session._isModified = true;
				};

				request.session.get = function(key, clear) {
					var value = request.session._store[key];
					if (clear) {
						request.session.clear(key);
					}
					return value;
				};

				request.session.set = function(key, value) {
					Hoek.assert(key, 'Missing key');
					Hoek.assert(
						typeof key === 'string' ||
							(typeof key === 'object' && value === undefined),
						'Invalid session.set() arguments'
					);

					request.session._isModified = true;

					if (typeof key === 'string') {
						var holder = {};
						holder[key] = value;
						key = holder;
					}

					Object.keys(key).forEach(function(name) {
						request.session._store[name] = key[name];
					});
				};

				request.session.clear = function(key) {
					request.session._isModified = true;
					delete request.session._store[key];
				};

				request.session.touch = function() {
					request.session._isModified = true;
				};

				request.session.flash = function(type, message, isOverride) {
					request.session._isModified = true;
					request.session._store._flash = request.session._store._flash || {};

					if (!type && !message) {
						var messages = request.session._store._flash;
						request.session._store._flash = {};
						return messages;
					}

					if (!message) {
						var messages = request.session._store._flash[type];
						delete request.session._store._flash[type];
						return messages || [];
					}

					request.session._store._flash[type] = (
						isOverride ?
							message :
							(request.session._store._flash[type] || []).concat(message)
					);
					return request.session._store._flash[type];
				};

				request.session.store = function(callback) {
					doStore(request, callback);
				};

				if (err) {
					reply(err);
				} else {
					reply.continue();
				}
			},
			// Load session data from cookie
			sessionId = request.state[settings.name];

		request.session = {
			id: sessionId || Uuid.v4(),
			_store: {},
			_isModified: false,
			_isNew: !sessionId
		};

		if (sessionId) {
			return cache.get(sessionId, function(err, cached) {
				if (err) {
					return decorate(err);
				}
				if (cached) {
					request.session._store = cached;
				}
				return decorate();
			});
		}
		else {
			decorate();
		}
	});

	// Post handler
	plugin.ext('onPreResponse', function(request, reply) {
		if (request.session) {
			if (request.session._isModified || request.session._isNew) {
				// Save the session ID in a cookie
				reply.state(settings.name, request.session.id);
			}
			if (request.session._isModified) {
				doStore(request, function() {
					reply.continue();
				});
				return;
			}
		}
		reply.continue();
	});

	next();
};

exports.register.attributes = {
	pkg: require('../package.json')
};
