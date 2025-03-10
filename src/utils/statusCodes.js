export const statusCode = Object.freeze({
    OK: 200,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
    CREATED: 201,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
});

export const isValidStatusCode = (code) => {
    return Object.values(statusCode).includes(code);
};
