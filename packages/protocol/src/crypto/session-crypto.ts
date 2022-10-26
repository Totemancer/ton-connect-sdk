import { KeyPair } from './key-pair';
import { concatUint8Arrays, splitToUint8Arrays, toHexString } from '../utils';
import nacl, { BoxKeyPair } from 'tweetnacl';

export class SessionCrypto {
    private readonly nonceLength = 24;

    private readonly keyPair: BoxKeyPair;

    public readonly sessionId: string;

    constructor(keyPair?: KeyPair) {
        this.keyPair = keyPair ? this.createKeypairFromString(keyPair) : this.createKeypair();
        this.sessionId = toHexString(this.keyPair.publicKey);
    }

    private createKeypair(): BoxKeyPair {
        return nacl.box.keyPair();
    }

    private createKeypairFromString(keyPair: KeyPair): BoxKeyPair {
        return {
            publicKey: new TextEncoder().encode(keyPair.publicKey),
            secretKey: new TextEncoder().encode(keyPair.secretKey)
        };
    }

    private createNonce(): Uint8Array {
        const buffer = new Uint8Array(this.nonceLength);
        return crypto.getRandomValues(buffer);
    }

    public encrypt(message: string, receiverPublicKey: Uint8Array): Uint8Array {
        const encodedMessage = new TextEncoder().encode(message);
        const nonce = this.createNonce();
        const encrypted = nacl.box(
            encodedMessage,
            nonce,
            receiverPublicKey,
            this.keyPair.secretKey
        );
        return concatUint8Arrays(nonce, encrypted);
    }

    public decrypt(message: Uint8Array, senderPublicKey: Uint8Array): string {
        const [nonce, internalMessage] = splitToUint8Arrays(message, this.nonceLength);

        const decrypted = nacl.box.open(
            internalMessage,
            nonce,
            senderPublicKey,
            this.keyPair.secretKey
        );

        if (!decrypted) {
            throw new Error('Decryption error');
        }

        return new TextDecoder().decode(decrypted);
    }

    public stringifyKeypair(): KeyPair {
        return {
            publicKey: new TextDecoder().decode(this.keyPair.publicKey),
            secretKey: new TextDecoder().decode(this.keyPair.secretKey)
        };
    }
}