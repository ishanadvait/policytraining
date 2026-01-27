
const { generateKeyPairSync } = require('crypto');

function generateKeys() {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'jwk'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'jwk'
        }
    });

    // Supabase LTI_PUBLIC_JWK needs to be stringified JSON
    // We need to add 'kid' (Key ID) and 'alg' (Algorithm)
    const kid = 'lti-key-1';
    const alg = 'RS256';

    const publicJwk = {
        ...publicKey,
        kid,
        alg,
        use: 'sig'
    };

    const privateJwk = {
        ...privateKey,
        kid,
        alg,
        use: 'sig'
    };

    console.log("=== LTI Configuration Keys ===");
    console.log("\n[1] LTI_PUBLIC_JWK (Add this to Supabase Secrets):");
    console.log(JSON.stringify(publicJwk));

    console.log("\n[2] Private Key (Use this if you need to sign JWTs from the Tool):");
    console.log(JSON.stringify(privateJwk));

    console.log("\nNote: For this integration, we primarily use Moodle's keys to verify. \nBut Moodle requires us to expose a JWKS. Use the Public JWK above.");
}

generateKeys();
