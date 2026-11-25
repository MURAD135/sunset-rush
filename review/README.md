# تجربة Sunset Rush محليًا على الكمبيوتر

نزّل Sunset-Rush-Local.zip وفك الضغط في مجلد ثابت. افتح Sunset-Rush.html في Chrome أو Edge واضغط «العب». الأسهم للقيادة وSpace للانجراف وShift للنيترو. انتقلت ملفات الرسوم والفيزياء والتصميم إلى ملف HTML نفسه كي تعمل اللعبة دون تنزيل إضافي.

إذا منع المتصفح فتح الملفات المحلية، شغّل الأمر التالي في المجلد المستخرج ثم افتح http://localhost:8080/Sunset-Rush.html

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

على Windows مع Python يمكنك استخدام `py -m http.server 8080 --bind 127.0.0.1`. استخدم العنوان نفسه في كل جلسة للاحتفاظ بالتقدم. يمكنك تصدير حفظك من إعدادات اللعبة.

لإعادة إنشاء الحزمة من جذر المستودع:

```sh
npm ci
npm run build
node scripts/package-local.mjs
python3 -m zipfile -c review/Sunset-Rush-Local.zip artifacts/review/Sunset-Rush.html dist/THIRD_PARTY_NOTICES.txt
```
