#! /bin/sh

npm audit
npm audit fix
#if npm audit; then
#  npm run-script document
#  rm *orig* *toc\.*
  npm run-script prepublishOnly
  git add .
  npm version patch -m "$1" --force
  npm publish --tag latest
  git commit -m "$1"
#  git push origin beta --tags
  git push origin master --tags
#else
#  echo "Not publishing due to security vulnerabilites"
#fi
