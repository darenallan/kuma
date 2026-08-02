import uuid
from pathlib import Path

from cryptography.fernet import Fernet

from app.core.config import get_settings

settings = get_settings()


def _fernet() -> Fernet:
    if not settings.storage_encryption_key:
        raise RuntimeError(
            "STORAGE_ENCRYPTION_KEY manquante : requise pour chiffrer les PDF contractuels au repos."
        )
    return Fernet(settings.storage_encryption_key.encode())


def _storage_dir() -> Path:
    path = Path(settings.storage_path)
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_encrypted_pdf(reference: str, pdf_bytes: bytes) -> str:
    """Chiffre puis ecrit le PDF sur disque, retourne la cle de stockage (nom de fichier)."""
    storage_key = f"{reference}-{uuid.uuid4().hex}.pdf.enc"
    encrypted = _fernet().encrypt(pdf_bytes)
    (_storage_dir() / storage_key).write_bytes(encrypted)
    return storage_key


def load_decrypted_pdf(storage_key: str) -> bytes:
    encrypted = (_storage_dir() / storage_key).read_bytes()
    return _fernet().decrypt(encrypted)
