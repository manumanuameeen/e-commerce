const MESSAGES = {
    INVALID_EMAIL: "Please enter a valid email address",
    REQUIRED_FIELD: "This field is required",
    SERVER_ERROR: "An error occurred. Please try again later",
    INVALID_STATUS: "Invalid status value",
    NOT_FOUND: "Resource not found",

    USER_NOT_FOUND: "User with this email does not exist",
    EMAIL_MISMATCH: "Please enter your current email",
    USER_EXISTS: "User with this email already exists",
    USER_BLOCKED: "User blocked successfully",
    USER_UNBLOCKED: "User unblocked successfully",
    INVALID_CREDENTIALS: "Invalid email or password",

    PRODUCT_EXISTS: "Product already exists",
    PRODUCT_NOT_FOUND: "Product not found",
    PRODUCT_ADDED: "Product added successfully",
    PRODUCT_UPDATED: "Product updated successfully",
    PRODUCT_BLOCKED: "Product blocked successfully",
    PRODUCT_UNBLOCKED: "Product unblocked successfully",
    INVALID_CATEGORY: "Invalid category",
    IMAGE_PROCESSING_ERROR: "Error processing image",

    CATEGORY_EXISTS: "Category already exists",
    CATEGORY_NOT_FOUND: "Category not found",
    CATEGORY_ADDED: "Category added successfully",
    CATEGORY_UPDATED: "Category updated successfully",
    CATEGORY_LISTED: "Category listed successfully",
    CATEGORY_UNLISTED: "Category unlisted successfully",
    CATEGORY_OFFER_EXISTS: "Product within this category already has a product offer",

    ORDER_NOT_FOUND: "Order not found",
    ORDER_STATUS_UPDATED: "Order status updated successfully",
    ORDER_DELIVERED: "Delivered orders cannot be changed",
    ORDER_CANCELLED: "Cannot change status of cancelled order",
    ORDER_PAYMENT_PENDING: "Payment Pending cannot be changed",
    RETURN_REQUEST_INVALID: "Invalid return request state",
    RETURN_REQUEST_APPROVED: "Return request approved successfully",
    RETURN_REQUEST_REJECTED: "Return request rejected successfully",

    OFFER_NOT_FOUND: "Offer not found",
    OFFER_ADDED: "Offer added successfully",
    OFFER_UPDATED: "Offer updated successfully",
    OFFER_REMOVED: "Offer removed successfully",
    INVALID_DISCOUNT: "Discount must be between 1% and 100%",
    INVALID_OFFER_TYPE: "Invalid offer type or missing required fields",

    COUPON_EXISTS: "Coupon with this name already exists",
    COUPON_NOT_FOUND: "Coupon not found",
    COUPON_ADDED: "Coupon created successfully",
    COUPON_UPDATED: "Coupon updated successfully",
    COUPON_DELETED: "Coupon deleted successfully",
    INVALID_COUPON_NAME: "Coupon name must be between 3 and 50 characters and contain only alphanumeric characters",
    INVALID_EXPIRATION: "Expiration date must be a future date",
    INVALID_DISCOUNT_AMOUNT: "Discount amount must be a positive number and less than ₹10,000",
    INVALID_MINIMUM_AMOUNT: "Minimum purchase amount must be a positive number and less than ₹100,000",
    DISCOUNT_EXCEEDS_MINIMUM: "Discount amount must be less than minimum purchase amount",

    OTP_SEND_FAILED: "Failed to send OTP. Please try again",
    OTP_NOT_MATCHING: "The OTP you entered is incorrect. Please try again",
    OTP_VERIFIED: "OTP verified successfully",

    SESSION_ERROR: "Error destroying session",
    LOGOUT_SUCCESS: "Logged out successfully",
    ADMIN_REQUIRED: "Admin access required"
};

export default { MESSAGES };