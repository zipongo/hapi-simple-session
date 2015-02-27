# [**hapi**](https://github.com/hapijs/hapi)-simple-session

[![Build Status](https://secure.travis-ci.org/avaly/hapi-simple-session.png)](http://travis-ci.org/hapijs/hapi-simple-session)

> A simple Hapi session plugin

Requires: [hapi](https://github.com/hapijs/hapi) 8+

Disclaimer: Based on [hapi-simple-session](https://github.com/avaly/hapi-simple-session) project with the following features added:

- request.session.store() for the ability to save session to cache during request
- cookie is:
  - sent even if no data is stored in it
  - not resent once it exists on the client.
  - not sent for OPTIONS method
- Hapi 8


Original Disclaimer: Based on the [yar](https://github.com/hapijs/yar) project with the following features removed:

- no cookie encryption
- no lazy mode
