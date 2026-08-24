def build_rag_messages(query: str, context_chunks: list[str]) -> list[dict]:
    if context_chunks:
        context_block = "\n\n".join(f"- {chunk}" for chunk in context_chunks)
        system_prompt = (
            "You are a helpful customer support assistant. Answer the customer's "
            "question using ONLY the context below. If the context doesn't contain "
            "the answer, say you don't have that information and offer to connect "
            "them with a human agent — do not make up an answer.\n\n"
            f"Context:\n{context_block}"
        )
    else:
        system_prompt = (
            "You are a helpful customer support assistant. No relevant documents "
            "were found for this question. Let the customer know you don't have "
            "that information and offer to connect them with a human agent."
        )

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": query},
    ]