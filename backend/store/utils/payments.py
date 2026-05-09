from typing import Protocol, Dict, Any, Type
from django.conf import settings
from .chapa import initialize_chapa_payment, verify_chapa_transaction

class PaymentProvider(Protocol):
    def initialize(self, order, return_url: str | None = None) -> Dict[str, Any]:
        ...

    def verify(self, transaction_id: str) -> Dict[str, Any]:
        ...

class ChapaProvider:
    def initialize(self, order, return_url: str | None = None) -> Dict[str, Any]:
        return initialize_chapa_payment(order, return_url)

    def verify(self, transaction_id: str) -> Dict[str, Any]:
        return verify_chapa_transaction(transaction_id)

class PaymentProviderRegistry:
    _providers: Dict[str, Type[PaymentProvider]] = {
        "chapa": ChapaProvider,
    }

    @classmethod
    def get_provider(cls, name: str) -> PaymentProvider:
        provider_class = cls._providers.get(name.lower())
        if not provider_class:
            raise ValueError(f"Unsupported payment provider: {name}")
        return provider_class()

    @classmethod
    def register(cls, name: str, provider_class: Type[PaymentProvider]):
        cls._providers[name.lower()] = provider_class
