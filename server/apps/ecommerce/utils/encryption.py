from cryptography.fernet import Fernet
from core.config import settings
import base64
import hashlib


def get_encryption_key() -> bytes:
    """Generate encryption key from secret key"""
    key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    return base64.urlsafe_b64encode(key)


def encrypt_password(password: str) -> str:
    """Encrypt database password for storage"""
    f = Fernet(get_encryption_key())
    encrypted = f.encrypt(password.encode())
    return base64.urlsafe_b64encode(encrypted).decode()


def decrypt_password(encrypted_password: str) -> str:
    """Decrypt database password for use"""
    try:
        f = Fernet(get_encryption_key())
        encrypted_bytes = base64.urlsafe_b64decode(encrypted_password.encode())
        decrypted = f.decrypt(encrypted_bytes)
        return decrypted.decode()
    except Exception:
        # If decryption fails, assume password is not encrypted
        return encrypted_password