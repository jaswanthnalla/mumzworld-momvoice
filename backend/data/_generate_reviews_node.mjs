// One-off Node port of generate_reviews.py so the repo ships with materialized
// datasets even on machines without Python. The canonical generator is
// generate_reviews.py (referenced by README); this file produces identical JSON.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'sample_products');
mkdirSync(OUT_DIR, { recursive: true });

// Deterministic seeded PRNG (mulberry32) so output is reproducible.
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const randInt = (lo, hi) => Math.floor(rand() * (hi - lo + 1)) + lo;

const CHICCO_EN = [
  ["Lifesaver for the first three months — baby slept right next to me without me having to get up.", 5, "0-3m"],
  ["The side panel drops smoothly and reattaching to the bed is genuinely easy. Worth the price.", 5, "0-3m"],
  ["My newborn settled within minutes once I moved her into this. Solid build.", 5, "0-3m"],
  ["Mattress is firm and breathable. Fitted sheets from Mothercare work fine.", 4, "0-3m"],
  ["Wheels make it easy to roll into the living room during the day.", 5, "0-3m"],
  ["Adjusts to six heights — fit our high bed perfectly. Assembly took 20 minutes.", 5, "0-3m"],
  ["Stable, no wobble even when I leaned on the side. Feels safe.", 5, "0-3m"],
  ["Loved the rocking function in the early weeks for fussy nights.", 4, "0-3m"],
  ["Tilt feature helped with our reflux baby — pediatrician approved a slight incline.", 5, "0-3m"],
  ["Strap that connects to the bed frame works well, no gap between bed and crib.", 5, "0-3m"],
  ["Fabric is soft and washable. Removed and machine washed at 30C with no issue.", 4, "3-6m"],
  ["Used until 5 months, baby outgrew it but it served its purpose.", 4, "3-6m"],
  ["Mesh sides give great visibility — I can see her breathe from my pillow.", 5, "0-3m"],
  ["Setup instructions were clear, no missing parts.", 5, "0-3m"],
  ["Honestly the best baby purchase we made. Recommended to my sister.", 5, "0-3m"],
  ["Tight fit by 4 months — my baby was on the bigger side. Worked great till then.", 4, "3-6m"],
  ["Heavy to move between rooms once assembled. Wheels help on hard floors only.", 3, "0-3m"],
  ["Pricey but you do feel the quality. No regrets.", 4, "0-3m"],
  ["Strap that secures it to the bed seemed loose after a month. We added a second strap for peace of mind.", 3, "0-3m"],
  ["Mesh ripped slightly near the zip after 6 weeks. Customer service replaced it.", 2, "0-3m"],
  ["The lock on one wheel stopped clicking properly. Annoying but not dangerous.", 3, "0-3m"],
  ["Too narrow for a chunky baby past 3 months. We moved to a full cot earlier than planned.", 3, "3-6m"],
  ["The fabric attracts dust. Vacuum it weekly.", 3, "0-3m"],
  ["Mattress is thinner than I expected. Added a thin topper.", 3, "0-3m"],
  ["Took longer than 20 minutes to assemble despite the clear manual.", 3, "0-3m"],
  ["Wobbles slightly when at the highest setting on uneven flooring.", 2, "0-3m"],
  ["Loud creak when rocking — drove my husband mad at 3am.", 2, "0-3m"],
  ["Delivery took 8 days and the box was damaged. Product itself is fine though.", 1, null],
  ["Courier left it outside in the heat. Mumzworld handled the replacement quickly.", 2, null],
  ["Packaging was excessive but the crib arrived intact.", 4, null],
];
const CHICCO_AR = [
  ["سرير ممتاز للأشهر الأولى، البنت كانت تنام جنبي بدون ما أقوم من الفراش.", 5, "0-3m"],
  ["الجانب القابل للإنزال سهل الاستخدام وسريع. فعلاً يستاهل سعره.", 5, "0-3m"],
  ["ولدي ارتاح فيه من أول ليلة. التركيب سهل والمواد قوية.", 5, "0-3m"],
  ["المرتبة قاسية شوي بس مريحة للرضيع وآمنة.", 4, "0-3m"],
  ["الارتفاعات الستة ساعدتني أوصله لطول السرير عندي بالضبط.", 5, "0-3m"],
  ["شبك الجوانب يخلي الهوا يدخل والرؤية ممتازة بالليل.", 5, "0-3m"],
  ["بعد ٤ شهور صار ضيق على بنتي. كانت كبيرة الجسم.", 3, "3-6m"],
  ["الحزام اللي يثبته بسرير الأم كنت أحس فيه شوية رخاوة بعد فترة.", 2, "0-3m"],
  ["ثقيل وما يتنقل بسهولة بين الغرف.", 3, "0-3m"],
  ["التوصيل تأخر أسبوع كامل والكرتون كان مفتوح من جنب.", 2, null],
  ["جودة عالية بس السعر مرتفع مقارنة بالمنافسين.", 4, "0-3m"],
  ["استخدمته ٥ شهور وبعتها بحالة ممتازة. شراء ذكي.", 5, "0-3m"],
  ["صوت احتكاك خفيف عند الهز، يزعج بالليل.", 3, "0-3m"],
  ["التوصيلة بالسرير ممتازة، ما في فجوة بين السريرين.", 5, "0-3m"],
  ["القماش ناعم وقابل للغسيل. غسلته في الغسالة بدون مشكلة.", 4, "0-3m"],
  ["ابني هدأ من أول ليلة لما حطيناه فيه.", 5, "0-3m"],
  ["شراء يستاهل لكل أم جديدة. أنصح فيه بقوة.", 5, "0-3m"],
];

const MEDELA_EN = [
  ["Doubled my output compared to the single pump I had before. Game changer for working moms.", 5, "0-3m"],
  ["Quiet enough that I can pump in the office without anyone noticing.", 5, "0-3m"],
  ["Two-phase expression mimics baby — let-down comes within 90 seconds.", 5, "0-3m"],
  ["Battery lasts about 6 sessions on a charge. Great for travel.", 5, "0-3m"],
  ["Helped me build a freezer stash before going back to work at 3 months.", 5, "0-3m"],
  ["Comfortable flange — I went up a size from the default and it made a huge difference.", 4, "0-3m"],
  ["Easy to clean, parts come apart in seconds.", 5, "0-3m"],
  ["Suction is strong but adjustable. No nipple soreness like with the manual pump.", 5, "0-3m"],
  ["Worth every dirham for exclusive pumpers.", 5, "0-3m"],
  ["Light enough to use one-handed while answering emails.", 4, "0-3m"],
  ["Bottles included are good quality and compatible with Calma teats.", 4, "0-3m"],
  ["Increased my supply when my baby was in NICU and unable to latch.", 5, "0-3m"],
  ["Pumped 200ml in 15 minutes after a few weeks of use. Body adjusted quickly.", 5, "0-3m"],
  ["Travel-friendly, comes with a carry case. Took it on a 5-hour flight.", 5, "0-3m"],
  ["Customer service replaced a faulty membrane within 3 days. Solid support.", 5, "0-3m"],
  ["After 4 months the suction weakened slightly. Replaced the membranes and it was fine.", 4, "3-6m"],
  ["Tubing got moisture inside once. Followed the manual to dry it out — took an hour.", 3, "0-3m"],
  ["The motor is louder than I expected based on reviews — not whisper quiet.", 3, "0-3m"],
  ["Default flange size was too small for me. Had to buy a 27mm separately.", 2, "0-3m"],
  ["Heavy compared to wearable pumps. Not great for moving around the house.", 3, "0-3m"],
  ["Charging port felt fragile after 2 months of daily use.", 2, "0-3m"],
  ["One of the bottles cracked in the steriliser. Replacement was easy to find.", 3, "0-3m"],
  ["Suction lost power after 6 months — I think the motor is wearing out.", 2, "3-6m"],
  ["The on/off button stopped responding after 4 months. Out of warranty period for me.", 1, "3-6m"],
  ["Pricier than alternatives but you get what you pay for in build quality.", 4, "0-3m"],
  ["Hard to clean the small valves properly. Brush helps.", 3, "0-3m"],
  ["Box arrived dented but the pump was undamaged.", 3, null],
  ["Delivery was on time, packaging was good.", 5, null],
  ["Manual is in tiny font — had to download the PDF to actually read it.", 3, "0-3m"],
];
const MEDELA_AR = [
  ["ضاعف إنتاجي من الحليب مقارنة بالمضخة اليدوية. شي ممتاز للأمهات العاملات.", 5, "0-3m"],
  ["هادي وما تزعج باللي حواليك. أستخدمها بالمكتب بدون إحراج.", 5, "0-3m"],
  ["الشفط قوي ويتحكم فيه بسهولة. ما حسيت بألم في الحلمة.", 5, "0-3m"],
  ["سهلة التنظيف والأجزاء تنفك بسرعة.", 5, "0-3m"],
  ["البطارية تكفي ٥ أو ٦ جلسات. ممتازة للسفر.", 4, "0-3m"],
  ["الحجم الافتراضي للقمع كان صغير علي. اضطريت اشتري ٢٧ ملم منفصل.", 2, "0-3m"],
  ["بعد ٤ شهور ضعف الشفط شوي، غيرت الأغشية ورجعت طبيعية.", 4, "3-6m"],
  ["الموتور أصوته أعلى من المتوقع. مو هادي بالكامل.", 3, "0-3m"],
  ["ساعدتني أبني مخزون حليب قبل رجوعي للعمل.", 5, "0-3m"],
  ["سعرها مرتفع لكن الجودة فعلاً تفرق.", 4, "0-3m"],
  ["الزر الرئيسي توقف بعد ٤ شهور. خدمة العملاء كانت بطيئة بالاستجابة.", 2, "3-6m"],
  ["التوصيل سريع والتغليف ممتاز.", 5, null],
  ["استخدمتها يومياً لمدة ٦ شهور بدون مشاكل. شراء يستاهل.", 5, "0-3m"],
];

const MACLAREN_EN = [
  ["Lightweight enough to carry up our apartment stairs with one hand while holding the baby.", 5, "1-3y"],
  ["Folds in 3 seconds — saved me at the airport with a screaming toddler.", 5, "1-3y"],
  ["Reclines almost flat for naps on the go.", 4, "3-12m"],
  ["Wheels handle uneven Dubai pavements better than I expected.", 4, "1-3y"],
  ["Sun canopy is generous — covers her face completely even in afternoon sun.", 5, "1-3y"],
  ["Easy to fold one-handed once you get the hang of it.", 4, "1-3y"],
  ["Storage basket is small but fits a small backpack and water bottle.", 3, "1-3y"],
  ["Smooth steering with one hand even on grass.", 4, "1-3y"],
  ["Held my 18 month old comfortably. Will see how it goes as he grows.", 4, "1-3y"],
  ["Easy to fit in the boot of a small sedan after folding.", 5, "1-3y"],
  ["Used it for a 2-week Europe trip — survived flights and cobblestones.", 5, "1-3y"],
  ["Five-point harness is secure and adjusts as baby grows.", 5, "3-12m"],
  ["Frame feels solid despite being light. Aluminium not flimsy plastic.", 5, "1-3y"],
  ["Recline is quick — useful when she falls asleep mid-walk.", 4, "1-3y"],
  ["Stylish design, the navy color hides dirt well.", 5, "1-3y"],
  ["Hard to fold one-handed — needs both hands and a knee on most days.", 2, "1-3y"],
  ["Folds easily for some — for me it took 2 weeks of practice. Still useful.", 3, "1-3y"],
  ["Wheels squeak after 3 months of daily use. Need WD-40 every few weeks.", 3, "1-3y"],
  ["Recline mechanism is fiddly — strap pulls instead of a button.", 3, "1-3y"],
  ["Not great for newborns despite the recline. Bought a separate carrycot.", 2, "0-3m"],
  ["Tipped backward when I hung my heavy diaper bag on the handles. Lesson learned.", 2, "1-3y"],
  ["Storage basket too small for grocery runs.", 2, "1-3y"],
  ["Handles got hot in the Dubai sun — I wrap them now.", 3, "1-3y"],
  ["After a year, fabric on the seat is showing wear. Quality slipping?", 3, "1-3y"],
  ["Brake pedal stopped engaging fully after 8 months. I keep it in mind on slopes.", 2, "1-3y"],
  ["Cup holder is sold separately and is overpriced.", 3, "1-3y"],
  ["My toddler wriggles out of the harness — adjustment is finicky.", 2, "1-3y"],
  ["Box arrived damaged but stroller was fine. Mumzworld helped with claim.", 3, null],
  ["Delivery took 6 days, longer than the 2 day estimate.", 2, null],
];
const MACLAREN_AR = [
  ["خفيفة الوزن وأقدر أحملها بيد واحدة مع الطفل.", 5, "1-3y"],
  ["تنطوي بسرعة، أنقذتني في المطار.", 5, "1-3y"],
  ["الإطار قوي رغم خفة الوزن. شغل ممتاز.", 5, "1-3y"],
  ["صعب طيها بيد واحدة، تحتاج تمرين. مش سهلة زي ما يقولون.", 2, "1-3y"],
  ["العجلات تصدر صوت إزعاج بعد ٣ أشهر استخدام.", 3, "1-3y"],
  ["المظلة كبيرة وتغطي البنت بالكامل من الشمس.", 5, "1-3y"],
  ["سلة التخزين صغيرة جداً، ما تكفي.", 2, "1-3y"],
  ["استخدمتها بسفر طويل ومشت معي على كل أنواع الأرضيات.", 5, "1-3y"],
  ["الفرامل ضعفت بعد ٨ أشهر، صرت أحذر بالمنحدرات.", 2, "1-3y"],
  ["التوصيل تأخر يومين عن الموعد المتوقع.", 3, null],
  ["الحزام مريح وآمن، يعدل مع نمو الطفل.", 5, "3-12m"],
  ["سعرها عالي لكن جودتها تستاهل.", 4, "1-3y"],
  ["ابني تحركه مرة من حزام الأمان، التعديل صعب.", 2, "1-3y"],
];

const BASE_DATES = ["2024-09-15","2024-10-02","2024-10-21","2024-11-04","2024-11-19","2024-12-08","2024-12-22","2025-01-10","2025-01-28","2025-02-14"];

function build(name, productName, en, ar) {
  const chosen = [...en.map(x => [...x, "en"]), ...ar.map(x => [...x, "ar"])];
  const reviews = chosen.map(([txt, rating, age, lang], i) => ({
    id: i + 1,
    text: txt,
    rating,
    language: lang,
    verified_purchase: rand() > 0.15,
    helpful_votes: randInt(0, 30),
    date: BASE_DATES[i % BASE_DATES.length],
    reviewer_child_age: age,
  }));
  const out = { product_id: name, product_name: productName, review_count: reviews.length, reviews };
  const path = join(OUT_DIR, `${name}.json`);
  writeFileSync(path, JSON.stringify(out, null, 2), 'utf8');
  console.log(`Wrote ${path} with ${reviews.length} reviews`);
}

build("chicco_next2me_crib", "Chicco Next2Me Magic Crib", CHICCO_EN, CHICCO_AR);
build("medela_swing_pump", "Medela Swing Maxi Double Breast Pump", MEDELA_EN, MEDELA_AR);
build("maclaren_quest_stroller", "Maclaren Quest Stroller", MACLAREN_EN, MACLAREN_AR);
