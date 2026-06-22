# Slide Image Generation Fix

## Aap ka Python snippet
Wo code **as-is run nahi hoga** — `client.interactions.create(...)` Google ka brand-new API hai jo abhi `google-genai` SDK ke older versions mein nahi hai. Google ke docs khud niche `generateContent` (REST) version dikhate hain — wahi reliable hai. Concept sahi hai: model `gemini-3.1-flash-image` text se image generate karta hai, response mein `inline_data` (base64 PNG) aata hai.

## Slides mein masla
Current `generate-slide-image` function `gemini-2.0-flash-exp` use kar raha hai jo ab deprecated / unreliable hai (isi liye images nahi aa rahi). Plus — single `GEMINI_API_KEY` use karta hai, har dusra function rotation system par hai jo aap ne 15 keys ke saath setup kiya.

## Fix Plan

**1. Model upgrade** — `generate-slide-image/index.ts` ko switch karo:
- Primary: `gemini-3.1-flash-image` (Nano Banana 2 — fast, pro quality)
- Fallback: `gemini-2.5-flash-image` (original Nano Banana — agar 3.1 ka quota khatam)
- REST endpoint: `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- `responseModalities: ["IMAGE"]` request mein

**2. Key rotation integrate karo** — abhi sirf `GEMINI_API_KEY` parhta hai. Same rotation logic jo `ai-failover.ts` text ke liye karta hai use karenge: `GEMINI_API_KEY`, `GEMINI_API_KEY_2` … `GEMINI_API_KEY_15` mein se loop, 429/403/quota error pe next key, sab fail honi pe last error throw.

**3. Error handling** — agar image part response mein na ho (safety filter etc.), clear error message return karein taake frontend par "image unavailable" placeholder dikhe instead of silent fail.

## Files to change
- `supabase/functions/generate-slide-image/index.ts` — model switch + multi-key rotation + better error logs

## Out of scope
- Aap ka Python code app mein use nahi ho raha (slides ka backend Deno/TypeScript hai), so usko fix karne ki zarurat nahi — bas confirm: wo specific snippet `interactions.create` ki wajah se fail karega; REST/`generateContent` use karein agar Python se test karna ho.

Aap "Implement" press karein to main yeh edit kar deta hoon.