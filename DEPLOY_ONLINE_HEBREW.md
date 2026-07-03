# העלאת האתר לאינטרנט — כדי שיעבוד גם כשהמחשב שלך סגור

כרגע האתר רץ על המחשב שלך בכתובת:

```txt
http://localhost:3000
```

זה אומר שרק אתה רואה אותו, והוא עובד רק כשה־Terminal פתוח.

כדי שחברים יוכלו להצטרף גם כשהמחשב שלך סגור, צריך להעלות את האתר לשרת אמיתי בענן. הדרך הכי פשוטה פה היא Render.

---

## מה כבר מוכן בפרויקט

הוספתי לפרויקט קבצים שמתאימים להעלאה:

```txt
render.yaml
.gitignore
DEPLOY_ONLINE_HEBREW.md
```

וגם עדכנתי את הקוד כך שבשרת אמיתי הנתונים יישמרו בקובץ קבוע דרך:

```txt
DATA_FILE=/var/data/data.json
```

---

## התהליך הכללי

צריך לעשות 3 דברים:

1. להעלות את התיקייה ל־GitHub
2. לחבר את GitHub ל־Render
3. ללחוץ Deploy

אחרי זה תקבל לינק ציבורי, למשל:

```txt
https://world-cup-predictor.onrender.com
```

את הלינק הזה אתה שולח לחברים, והם יוכלו להירשם ולהתחבר גם כשהמחשב שלך כבוי.

---

# שלב 1 — ליצור חשבון GitHub

אם אין לך GitHub:

1. כנס ל־github.com
2. תיצור חשבון
3. תאשר מייל

---

# שלב 2 — ליצור Repository חדש

בתוך GitHub:

1. תלחץ על `+` למעלה
2. תלחץ `New repository`
3. בשם תכתוב:

```txt
world-cup-predictor
```

4. תבחר `Private` או `Public` — עדיף `Private`
5. תלחץ `Create repository`

---

# שלב 3 — להעלות את הקבצים ל־GitHub בדרך הכי קלה

בתוך ה־repository החדש:

1. תלחץ `uploading an existing file`
2. תגרור לשם את כל הקבצים מתוך התיקייה `world-cup-predictor`
3. לא חובה להעלות את `node_modules`, כי Render יעשה `npm install` לבד
4. תלחץ `Commit changes`

חשוב: לא להעלות את הקובץ `.env` אם GitHub מזהיר עליו. Render יקבל את הסודות לבד דרך `render.yaml`.

---

# שלב 4 — לפתוח Render

1. כנס ל־render.com
2. תתחבר עם GitHub
3. תאשר ל־Render גישה ל־repository שיצרת

---

# שלב 5 — ליצור Web Service

בתוך Render:

1. תלחץ `New`
2. תלחץ `Web Service`
3. תבחר את ה־repository:

```txt
world-cup-predictor
```

4. Render אמור לזהות שזה Node.js
5. שים את ההגדרות האלה אם הוא מבקש:

```txt
Build Command: npm install
Start Command: npm start
Health Check Path: /api/health
```

6. תלחץ `Deploy Web Service`

---

# שלב 6 — לבדוק שהאתר עלה

אחרי כמה דקות Render יראה לך כתובת ציבורית.

תפתח אותה בדפדפן.

אם האתר עולה — זהו. עכשיו זה עובד גם כשהמחשב שלך סגור.

---

# חשוב מאוד לגבי שמירת משתמשים

במחשב שלך הנתונים נשמרים כאן:

```txt
data/data.json
```

ב־Render הנתונים נשמרים בדיסק קבוע כאן:

```txt
/var/data/data.json
```

זה חשוב כדי שמשתמשים, סיסמאות, ניחושים ונקודות לא יימחקו.

---

# אם האתר לא עולה

תיכנס ב־Render ל־`Logs`.

אם אתה רואה שגיאה, תצלם לי את המסך של ה־Logs ואני אגיד לך בדיוק מה לתקן.

---

# בדיקה מהירה אחרי ההעלאה

תעשה בדיקה כזאת:

1. תפתח את הלינק הציבורי
2. תלחץ Join
3. תיצור משתמש ראשון
4. תעשה ניחוש על משחק
5. תפתח חלון גלישה בסתר
6. תיצור משתמש שני
7. תבדוק שה־Leaderboard עובד

אם זה עובד, האתר מוכן לחברים.
