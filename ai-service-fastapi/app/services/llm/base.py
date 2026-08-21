from abc import ABC, abstractmethod


class LLMProvider(ABC):
    @abstractmethod
    def chat_completion(self, messages: list[dict]) -> str:
        """Given [{'role': ..., 'content': ...}, ...], return the assistant's reply text."""
        raise NotImplementedError