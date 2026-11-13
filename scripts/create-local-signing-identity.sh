#!/bin/sh
# Creates "Kap Local Signing", a self-signed code signing certificate in the
# login keychain. `pnpm run pack:local` and `pnpm dist` sign with it.
#
# Why: macOS ties Screen Recording and Microphone grants to the app's code
# signature. An ad hoc signature changes with every build, so each local build
# needs the grants again, and two copies of Kap (say /Applications and dist/)
# keep taking the grant from each other. A certificate signature stays the same
# across builds, so the grants carry over.
#
# macOS asks for your password once, to trust the certificate for code signing.
# To remove it later: Keychain Access → login → My Certificates → delete
# "Kap Local Signing".
set -eu

name='Kap Local Signing'
keychain="$HOME/Library/Keychains/login.keychain-db"

if /usr/bin/security find-identity -v -p codesigning "$keychain" | grep -q "\"$name\""; then
  echo "\"$name\" already exists and is trusted for code signing."
  exit 0
fi

work_dir=$(mktemp -d)
trap 'rm -rf "$work_dir"' EXIT
cd "$work_dir"

cat > openssl.cnf <<EOF
[req]
distinguished_name = subject
x509_extensions = code_signing
prompt = no

[subject]
CN = $name

[code_signing]
basicConstraints = critical, CA:false
keyUsage = critical, digitalSignature
extendedKeyUsage = critical, codeSigning
EOF

# /usr/bin/openssl is LibreSSL, whose PKCS #12 files `security import` accepts.
/usr/bin/openssl req -x509 -newkey rsa:2048 -nodes -days 3650 -config openssl.cnf -keyout key.pem -out certificate.pem
/usr/bin/openssl pkcs12 -export -inkey key.pem -in certificate.pem -name "$name" -passout pass:kap -out identity.p12

# -T lets codesign use the key without asking each time.
/usr/bin/security import identity.p12 -k "$keychain" -P kap -T /usr/bin/codesign
/usr/bin/security add-trusted-cert -r trustRoot -p codeSign -k "$keychain" certificate.pem

/usr/bin/security find-identity -v -p codesigning "$keychain" | grep "\"$name\""
echo "Created \"$name\". Run pnpm run pack:local to build with it."
