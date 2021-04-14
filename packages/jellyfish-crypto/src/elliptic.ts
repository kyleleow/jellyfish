import ecc from 'tiny-secp256k1'
import { DERSignature } from './der'

/**
 * Provides the interface for an elliptic curve pair to sign and verify hash.
 * This interface is Promise based to allow async operations, this is required for hardware or network based elliptic
 * curve operation. Everything must be implemented in little endian because DeFi Blockchain uses LE.
 *
 * Signature must be encoded with Distinguished Encoding Rules.
 * @see https://github.com/bitcoin/bips/blob/master/bip-0066.mediawiki
 */
export interface EllipticPair {
  publicKey: () => Promise<Buffer>
  privateKey: () => Promise<Buffer>

  /**
   * @param hash to sign
   * @return signature of signed hash in DER
   */
  sign: (hash: Buffer) => Promise<Buffer>

  /**
   * @param hash to verify with signature
   * @param derSignature of the hash in encoded with Distinguished Encoding Rules, SIGHASHTYPE must not be included
   * @return validity of signature of the hash
   */
  verify: (hash: Buffer, derSignature: Buffer) => Promise<boolean>
}

/**
 * Wraps secp256k1 from 'tiny-secp256k1' & 'bip66'
 */
class SECP256K1 implements EllipticPair {
  private readonly privKey: Buffer
  private readonly pubKey: Buffer

  constructor (privKey: Buffer) {
    this.privKey = privKey
    const pubKey = ecc.pointFromScalar(privKey, true)
    if (pubKey === null) {
      throw new Error('point at infinity')
    }
    this.pubKey = pubKey
  }

  async privateKey (): Promise<Buffer> {
    return this.privKey
  }

  async publicKey (): Promise<Buffer> {
    return this.pubKey
  }

  async sign (hash: Buffer): Promise<Buffer> {
    const signature = ecc.sign(hash, this.privKey)
    return DERSignature.encode(signature)
  }

  async verify (hash: Buffer, derSignature: Buffer): Promise<boolean> {
    const signature = DERSignature.decode(derSignature)
    return ecc.verify(hash, this.pubKey, signature)
  }
}

/**
 * @param buffer in little endian
 * @return SECP256K1 EllipticPair
 */
export function getEllipticPairFromPrivateKey (buffer: Buffer): EllipticPair {
  return new SECP256K1(buffer)
}