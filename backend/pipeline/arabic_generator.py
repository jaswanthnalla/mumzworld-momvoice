"""Step 3 — generate native Arabic verdict (NOT a translation)."""
import json
from .openrouter_client import chat_json

ARABIC_MODEL = "qwen/qwen-2.5-72b-instruct:free"

SYSTEM_PROMPT = """أنت كاتبة محتوى متخصصة في منتجات الأمومة والطفولة لموقع مامز وورلد، أكبر متجر إلكتروني للأمهات في الشرق الأوسط.

اكتبي "حكم الأمهات" بالعربية بناءً على الإشارات المستخرجة من المراجعات.

القواعد:
- اكتبي بالعربية الفصحى المبسطة، بأسلوب دافئ يناسب أمهات الخليج.
- لا تترجمي النص الإنجليزي. اكتبي بشكل طبيعي كأنك تتحدثين مع أم.
- إذا كانت هناك مخاوف، اذكريها بصدق.
- لا تختلقي معلومات غير موجودة في الملخص.
- العنوان (headline_ar) يجب أن يكون جملة واحدة قصيرة.

أعيدي JSON فقط يحتوي على ثلاثة حقول بالضبط:
{
  "headline_ar": "...",
  "summary_ar": "...",
  "best_for_ar": "..."
}
بدون أي مقدمة أو شرح.
"""


async def generate_arabic(product_name: str, review_count: int, extraction: dict) -> dict:
    user = (
        f"المنتج: {product_name}\n"
        f"عدد المراجعات: {review_count}\n\n"
        f"الإشارات المستخرجة:\n{json.dumps(extraction, ensure_ascii=False, indent=2)}"
    )
    result = await chat_json(ARABIC_MODEL, SYSTEM_PROMPT, user, temperature=0.4)
    return {
        "headline_ar": result.get("headline_ar", ""),
        "summary_ar": result.get("summary_ar", ""),
        "best_for_ar": result.get("best_for_ar", ""),
    }
