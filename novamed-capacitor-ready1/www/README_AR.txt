NovaMed - نسخة إصلاح مزامنة الطالب من Supabase

هذه النسخة تصلح المشكلة التي كانت تجعل الجهاز الثاني يقول: account created
بدلاً من استيراد نفس حساب الطالب من Supabase.

التعديل المهم:
- لم يعد التطبيق ينشئ حساب طالب محلي بصمت عندما يفشل الاتصال بـ Supabase.
- تسجيل الطالب الآن يتأكد أولاً أن Supabase جاهز، ثم يبحث في جدول student_profiles.
- إذا وجد نفس الاسم + الرمز، يسحب التقدم من Supabase ويعرض رسالة: Welcome back from Supabase.
- إذا لم يستطع قراءة الجدول، يعطي خطأ واضح مثل RLS أو table missing أو URL/anon key missing.
- تم تعديل Service Worker حتى لا يحتفظ بنسخة قديمة/فارغة من supabase-config.js.

طريقة التشغيل الصحيحة:
1. افتح Supabase SQL Editor وشغّل ملف SUPABASE_SETUP.sql كاملاً.
2. افتح ملف supabase-config.js قبل النشر وضع:
   - url: Project URL
   - anonKey: anon public key
   - bucket: novamed
   - videoFolder: focus video
   - fileFolder: novamed-files

مهم جداً:
إذا وضعت URL و anon key فقط من داخل Cloud Setup، فهذه القيم تنحفظ داخل ذلك المتصفح فقط.
لذلك الجهاز الثاني لن يعرف Supabase إلا إذا:
- وضعتها داخل supabase-config.js قبل رفع الموقع، أو
- فتحت Cloud Setup في الجهاز الثاني أيضاً.

الأفضل للنشر:
ضع بيانات Supabase العامة داخل supabase-config.js ثم ارفع المشروع من جديد، حتى كل الأجهزة تقرأ نفس مشروع Supabase تلقائياً.

ما يتم مزامنته داخل public.student_profiles:
- اسم الطالب.
- رمز الطالب كـ hash وليس كنص مباشر.
- XP والـ streak.
- تقدم الفيديوهات: percent و currentTime و duration و completed.
- محاولات MCQ: الصحيح، الخطأ، timeout، وآخر اختيار.
- My Mistakes والملاحظات.
- Daily To-Do.
- الخطة الدراسية.
- Exam/calendar targets.
- آخر مسار مفتوح داخل الفيديوهات والكيوبنك.

بعد التحديث:
يفضل من المتصفح عمل Hard Refresh أو مسح Cache/PWA القديم إذا بقي يفتح نسخة قديمة.
