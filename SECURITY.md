# Security

These packages run in your page or on your server. They make no network
requests of their own, keep nothing outside the page they are on, and have no
runtime dependencies. Their seeded random numbers are for fair, repeatable
games and are not secret: never use a seed as a credential.

If you find a way to make one do something it should not, such as an input
that makes a solver or a check run far too long, or text that gets out of a
drawing into the page, please write to john@johnmorris.ca rather than opening
a public issue. Reports are read and kept confidential, and a fix is released
as soon as there is one.

Only the latest version of each package is supported. Each needs Node 22 or
later on a server; in a browser, any current one.
