var FaultyCache,
	storage = {};

module.exports = FaultyCache = function() {
	return this;
};

FaultyCache.prototype.validateSegmentName = function(key) {
	return null;
};

FaultyCache.prototype.start = function(cb) {
	cb();
};

FaultyCache.prototype.isReady = function() {
	return true;
};

FaultyCache.prototype.get = function(key, cb) {
	cb(null, {
		item: storage[key.id],
		stored: Date.now() - 60000,
		ttl: 3600000
	});
};

FaultyCache.prototype.set = function(key, value, ttl, cb) {
	storage[key.id] = value;
	// This is how the faulty callback works in catbox-memcached 1.0.4
	// https://github.com/hapijs/yar/issues/53
	cb(null, true);
};

FaultyCache.prototype.drop = function(key, cb) {
	console.log('drop', key);
	cb(null);
};
