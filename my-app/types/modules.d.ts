// Custom type declarations for libraries if @types are not installed locally

declare module "bcryptjs" {
  export function hash(s: string, salt: number | string): Promise<string>;
  export function hashSync(s: string, salt?: number | string): string;
  export function compare(s: string, hash: string): Promise<boolean>;
  export function compareSync(s: string, hash: string): boolean;
  export function genSalt(rounds?: number): Promise<string>;
  export function genSaltSync(rounds?: number): string;
}

declare module "jsonwebtoken" {
  export interface SignOptions {
    expiresIn?: string | number;
    issuer?: string;
    subject?: string;
    audience?: string | string[];
  }
  export function sign(payload: string | Buffer | object, secretOrPrivateKey: string | Buffer, options?: SignOptions): string;
  export function verify(token: string, secretOrPublicKey: string | Buffer): any;
  export function decode(token: string): any;
}

declare module "nodemailer" {
  export interface SendMailOptions {
    from?: string;
    to?: string;
    subject?: string;
    text?: string;
    html?: string;
  }
  export interface Transporter {
    sendMail(mailOptions: SendMailOptions): Promise<any>;
  }
  export function createTransport(transportUri: any, defaults?: any): Transporter;
}
