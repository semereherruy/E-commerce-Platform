from rest_framework.throttling import AnonRateThrottle


class AuthLoginBurstThrottle(AnonRateThrottle):
    """
    Short-window protection for login endpoint.
    """

    scope = "auth_login_burst"


class AuthLoginSustainedThrottle(AnonRateThrottle):
    """
    Longer-window protection for login endpoint.
    """

    scope = "auth_login_sustained"
