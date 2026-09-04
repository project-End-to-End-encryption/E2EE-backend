import dotenv from 'dotenv'
dotenv.config()

const sessionConfig = {
    cookieName: process.env.SESSION_COOKIE_NAME,

    expiry: process.env.SESSION_TIMEOUT,

    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'prod',
        sameSite: 'lax',
        path: '/'
    }
};

export default sessionConfig