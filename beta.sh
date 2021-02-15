#! /bin/sh

npm audit
npm audit fix
#if npm audit; then
#  npm run-script document
#  rm *orig* *toc\.*
if  npm run lint; then
if npm run build; then
  git add .
  npm version patch -m "$1" --force
  npm publish --tag beta
  git commit -m "$1"
  git push origin beta --tags
else
  echo "Not publishing due to build failure"
fi

else
  echo "Not publishing due to lint failure"
fi
