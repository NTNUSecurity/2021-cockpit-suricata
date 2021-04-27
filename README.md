# cockpit-suricata

This is a bachelor project started by four student from NTNU.

The objective of this project is to develop a module for Cockpit to further simplify the administration of Suricata IDS.



## Project requirements
* Start, restart and stop the suricata service
* Administer IDS-signatures
* Show health of the service
* Show relevant service logs
* Show alerts
* Product has to be open-source (GPLv2)

## Group

| Group member         | LinkedIn                                      | GitHub                      |
|----------------------|-----------------------------------------------|-----------------------------|
| Anders Svarverud     |                                               | github.com/Anders-Svarverud |
| Said-Emin Evmurzajev |                                               |                             |
| Sigve Sudland        | <https://www.linkedin.com/in/sigve-sudland>   | gitlab.com/Sudland          |
| Sindre Morvik        |                                               |                             |

## Known issues
* Config tab is known to crash when editing values
* Signatures tab have no error reporting when applying changes
* Alerts tab does not have any fancy features

# Getting and building the source

Require components:

* nodejs
* npm
* [sassc](https://github.com/sass/sassc)
* rpm/rpmbuild (optional)

On debian/ubuntu
```
apt-get update && apt-get install sassc rpm nodejs npm -y
```

On fedora
```
dnf install rpm-build rpmdevtools sassc nodejs
```

Make sure you have `npm` available (usually from your distribution package).
These commands check out the source and build it into the `dist/` directory:

```
git clone https://github.com/sigve-sudland/
cd starter-kit
make
```

# Installing

`make install` compiles and installs the package in `/usr/share/cockpit/`. The
convenience targets `srpm` and `rpm` build the source and binary rpms,
respectively. Both of these make use of the `dist-gzip` target, which is used
to generate the distribution tarball. In `production` mode, source files are
automatically minified and compressed. Set `NODE_ENV=production` if you want to
duplicate this behavior.

For development, you usually want to run your module straight out of the git
tree. To do that, link that to the location were `cockpit-bridge` looks for packages:

```
mkdir -p ~/.local/share/cockpit
ln -s `pwd`/dist ~/.local/share/cockpit/starter-kit
```

After changing the code and running `make` again, reload the Cockpit page in
your browser.

You can also use
[watch mode](https://webpack.js.org/guides/development/#using-watch-mode) to
automatically update the webpack on every code change with

    npm run watch

or

    make watch

# Running eslint

Cockpit Starter Kit uses [ESLint](https://eslint.org/) to automatically check
JavaScript code style in `.js` and `.jsx` files.

The linter is executed within every build as a webpack preloader.

For developer convenience, the ESLint can be started explicitly by:

    npm run eslint

Violations of some rules can be fixed automatically by:

    npm run eslint:fix

Rules configuration can be found in the `.eslintrc.json` file.

# Automated maintenance

It is important to keep your [NPM modules](./package.json) up to date, to keep
up with security updates and bug fixes. This is done with the
[npm-update bot script](https://github.com/cockpit-project/bots/blob/master/npm-update)
which is run weekly or upon [manual request](https://github.com/cockpit-project/starter-kit/actions) through the
[npm-update.yml](.github/workflows/npm-update.yml) [GitHub action](https://github.com/features/actions).

# Further reading

* The [Starter Kit announcement](http://cockpit-project.org/blog/cockpit-starter-kit.html)
   blog post explains the rationale for this project.
* [Cockpit Deployment and Developer documentation](http://cockpit-project.org/guide/latest/)
* [Make your project easily discoverable](http://cockpit-project.org/blog/making-a-cockpit-application.html)

