// Structured lessons for the English plan, written for level B2. A lesson
// teaches one skill end to end: an intro, the method in steps, a bank of
// useful phrases, and exercises with the scripts and prompts to practise
// with. Everything is bilingual, like the rest of the app.
//
// lesson   = { id, skill, level, title: {en, ar}, minutes, intro: {en, ar},
//              steps: [{en, ar}], phrases: [{en, ar}], exercises: [exercise] }
// exercise = { id, title: {en, ar}, minutes, instructions: {en, ar},
//              lines?: [{en, ar}], prompts?: [{en, ar}] }
//
// Exercise ids are recorded in the english log (log[day].done[id]), so
// they must stay unique across all lessons.

export const LESSONS = [
  {
    id: 'b2-shadowing',
    skill: 'shadowing',
    level: 'B2',
    title: { en: 'Shadow like a native speaker', ar: 'حاكِ كالناطق الأصلي' },
    minutes: 25,
    intro: {
      en: 'Shadowing means listening to a native speaker and repeating what they say at the same time, half a second behind them, like an echo. You copy not only the words but the music of the language: stress, rhythm, pauses and melody. At B2 your grammar and vocabulary are already strong; shadowing is what turns that knowledge into fluent, natural speech, because your mouth learns the patterns your ears already know.',
      ar: 'المحاكاة الصوتية تعني أن تستمع إلى ناطق أصلي وتردد ما يقوله في اللحظة نفسها، متأخراً عنه بنصف ثانية، كأنك صدى صوته. أنت لا تقلد الكلمات فقط، بل موسيقى اللغة: النبر والإيقاع والوقفات والنغمة. في مستوى B2 قواعدك ومفرداتك قوية أصلاً، والمحاكاة هي ما يحوّل هذه المعرفة إلى كلام طبيعي وطلق، لأن فمك يتعلم الأنماط التي تعرفها أذنك أصلاً.',
    },
    steps: [
      { en: 'Listen once without speaking. Follow the text and just hear the melody.', ar: 'استمع مرة واحدة دون أن تتكلم. تابع النص وأنصت للنغمة فقط.' },
      { en: 'Listen again and mark the chunks: draw a line where the speaker pauses, and underline the stressed words.', ar: 'استمع مرة أخرى وحدّد المقاطع: ارسم خطاً حيث يتوقف المتحدث وضع خطاً تحت الكلمات المنبورة.' },
      { en: 'Whisper-shadow: play it again and repeat half a second behind the speaker, quietly, keeping their rhythm.', ar: 'حاكِ هامساً: شغّل التسجيل وكرر متأخراً بنصف ثانية وبصوت منخفض مع الحفاظ على إيقاع المتحدث.' },
      { en: 'Full-voice shadow: repeat at normal volume, matching the stress and the melody, not just the words.', ar: 'حاكِ بصوت كامل: كرر بصوت طبيعي وطابِق النبر والنغمة، لا الكلمات فقط.' },
      { en: 'Record yourself shadowing, then listen to the original and your version back to back. Repeat the chunks that still sound different.', ar: 'سجّل نفسك أثناء المحاكاة، ثم استمع إلى الأصل وإلى تسجيلك متتاليين. كرر المقاطع التي ما زالت تبدو مختلفة.' },
    ],
    phrases: [
      { en: 'as a result of this', ar: 'نتيجةً لذلك' },
      { en: 'in the long run', ar: 'على المدى الطويل' },
      { en: 'a growing number of people', ar: 'عدد متزايد من الناس' },
      { en: 'on the other hand', ar: 'من ناحية أخرى' },
      { en: 'the point is that…', ar: 'المهم هو أن…' },
      { en: 'what this means is…', ar: 'ما يعنيه هذا هو…' },
    ],
    exercises: [
      {
        id: 'shadow-news',
        title: { en: 'Shadow the news', ar: 'حاكِ نشرة الأخبار' },
        minutes: 8,
        instructions: {
          en: 'Read each line aloud at newsreader speed (or tap listen), then shadow it twice: once whispering, once at full voice. Keep the formal, falling melody of news English. At the end, shadow the whole bulletin without stopping.',
          ar: 'اقرأ كل سطر بصوت عالٍ بسرعة مذيع الأخبار (أو اضغط زر الاستماع)، ثم حاكِه مرتين: مرة هامساً ومرة بصوت كامل. حافظ على نغمة الأخبار الرسمية الهابطة. وفي النهاية حاكِ النشرة كاملة دون توقف.',
        },
        lines: [
          { en: 'Good evening. The city council has announced a new plan to cut waiting times at public hospitals.', ar: 'مساء الخير. أعلن مجلس المدينة خطة جديدة لتقليل أوقات الانتظار في المستشفيات العامة.' },
          { en: 'Under the plan, a growing number of clinics will stay open until ten in the evening.', ar: 'وبموجب الخطة، سيبقى عدد متزايد من العيادات مفتوحاً حتى العاشرة مساءً.' },
          { en: 'Officials say the change comes as a result of a survey of more than five thousand patients.', ar: 'ويقول المسؤولون إن التغيير جاء نتيجة استطلاع شمل أكثر من خمسة آلاف مريض.' },
          { en: 'Doctors have welcomed the decision, but they warn that more nurses will be needed.', ar: 'وقد رحّب الأطباء بالقرار، لكنهم حذّروا من الحاجة إلى مزيد من الممرضين.' },
          { en: 'On the other hand, some residents worry that smaller towns will be left behind.', ar: 'ومن ناحية أخرى، يخشى بعض السكان أن تُترك البلدات الصغيرة خلف الركب.' },
          { en: 'The health minister told reporters that no clinic would close under the new system.', ar: 'وقال وزير الصحة للصحفيين إنه لن يُغلق أي عيادة في ظل النظام الجديد.' },
          { en: 'In the long run, the government hopes the plan will bring care closer to people’s homes.', ar: 'وعلى المدى الطويل، تأمل الحكومة أن يقرّب هذا المخطط الرعاية الصحية من بيوت الناس.' },
          { en: 'The first changes begin next month, and a full report is expected by the end of the year.', ar: 'وتبدأ التغييرات الأولى الشهر المقبل، ويُتوقع صدور تقرير كامل بنهاية العام.' },
          { en: 'That is all from us tonight. Thank you for watching, and good night.', ar: 'هذا كل ما لدينا الليلة. شكراً لمشاهدتكم، وتصبحون على خير.' },
        ],
      },
      {
        id: 'shadow-talk',
        title: { en: 'Shadow a talk, chunk by chunk', ar: 'حاكِ محاضرة مقطعاً مقطعاً' },
        minutes: 9,
        instructions: {
          en: 'This talk segment lasts 60–90 seconds and is already split into intonation chunks (the / marks show where the speaker breathes). Loop one chunk at a time: listen, whisper-shadow it three times, then say it at full voice. When every chunk feels easy, shadow the whole segment in one go and record it.',
          ar: 'هذا المقطع من محاضرة مدته 60–90 ثانية ومقسّم أصلاً إلى مقاطع نغمية (علامة / تُظهر أين يتنفس المتحدث). كرر كل مقطع على حدة: استمع، حاكِه هامساً ثلاث مرات، ثم قله بصوت كامل. وعندما تصبح كل المقاطع سهلة، حاكِ المقطع كاملاً دفعة واحدة وسجّله.',
        },
        lines: [
          { en: 'Most people believe / that talent decides / who learns a language well.', ar: 'يعتقد أغلب الناس أن الموهبة هي التي تحدد من يتعلم لغة ما جيداً.' },
          { en: 'But after twenty years of teaching, / I can tell you / that is simply not true.', ar: 'لكن بعد عشرين عاماً من التدريس، أستطيع أن أقول لكم إن هذا ببساطة غير صحيح.' },
          { en: 'The students who succeed / are not the most talented ones. / They are the most consistent ones.', ar: 'الطلاب الذين ينجحون ليسوا الأكثر موهبة، بل الأكثر استمرارية.' },
          { en: 'They practise a little / every single day, / even when they do not feel like it.', ar: 'يتدربون قليلاً كل يوم، حتى عندما لا يرغبون في ذلك.' },
          { en: 'Small steps, / repeated daily, / beat big efforts / once a month.', ar: 'الخطوات الصغيرة المتكررة يومياً تتفوق على الجهود الكبيرة مرة في الشهر.' },
          { en: 'So do not ask yourself / whether you are talented. / Ask whether you showed up today.', ar: 'لذا لا تسأل نفسك إن كنت موهوباً، بل اسأل إن كنت قد حضرت اليوم.' },
          { en: 'Because in the long run, / habits always win.', ar: 'لأن العادات تنتصر دائماً على المدى الطويل.' },
          { en: 'And the good news is: / anyone can build a habit.', ar: 'والخبر السار هو أن أي شخص يستطيع بناء عادة.' },
        ],
      },
      {
        id: 'shadow-dialogue',
        title: { en: 'Shadow a dialogue: both parts', ar: 'حاكِ حواراً: كلا الدورين' },
        minutes: 8,
        instructions: {
          en: 'A workplace dialogue between a manager (Sara) and a team member (Omar). Shadow Sara’s lines first, then Omar’s, then play both parts in time with the recording. Notice how questions rise at the end and statements fall.',
          ar: 'حوار في مكان العمل بين مديرة (سارة) وعضو في الفريق (عمر). حاكِ سطور سارة أولاً، ثم سطور عمر، ثم مثّل الدورين معاً في الوقت نفسه مع التسجيل. لاحظ كيف ترتفع النغمة في نهاية الأسئلة وتهبط في نهاية الجمل الخبرية.',
        },
        lines: [
          { en: 'Sara: Morning, Omar. Have you got a minute? I’d like to talk about Friday’s deadline.', ar: 'سارة: صباح الخير يا عمر. هل لديك دقيقة؟ أود أن نتحدث عن الموعد النهائي يوم الجمعة.' },
          { en: 'Omar: Of course. Actually, that’s exactly what I wanted to raise with you.', ar: 'عمر: بالتأكيد. في الحقيقة، هذا بالضبط ما أردت أن أثيره معك.' },
          { en: 'Sara: The client has asked for the full report, not just the summary. Can we manage that?', ar: 'سارة: طلب العميل التقرير الكامل، لا الملخص فقط. هل نستطيع إنجاز ذلك؟' },
          { en: 'Omar: We can, but I’ll need one more day for the figures. They have to be checked twice.', ar: 'عمر: نستطيع، لكنني سأحتاج إلى يوم إضافي من أجل الأرقام. يجب تدقيقها مرتين.' },
          { en: 'Sara: That sounds reasonable. What if we send the summary on Friday and the full report on Monday?', ar: 'سارة: هذا يبدو معقولاً. ما رأيك أن نرسل الملخص يوم الجمعة والتقرير الكامل يوم الاثنين؟' },
          { en: 'Omar: That works for me. I’ll email the client today so there are no surprises.', ar: 'عمر: يناسبني ذلك. سأراسل العميل اليوم حتى لا تكون هناك مفاجآت.' },
          { en: 'Sara: Perfect. And Omar — thanks for flagging this early instead of struggling in silence.', ar: 'سارة: ممتاز. وعمر — شكراً لأنك نبّهتني مبكراً بدلاً من أن تعاني في صمت.' },
          { en: 'Omar: Lesson learned from last time, I suppose!', ar: 'عمر: درس تعلمته من المرة الماضية، على ما أظن!' },
          { en: 'Sara: Exactly. Right, let’s catch up again on Thursday and see where we are.', ar: 'سارة: بالضبط. حسناً، لنتقابل مجدداً يوم الخميس ونرَ أين وصلنا.' },
          { en: 'Omar: Thursday it is. I’ll bring the draft figures with me.', ar: 'عمر: الخميس إذن. سأحضر مسودة الأرقام معي.' },
        ],
      },
    ],
  },
  {
    id: 'b2-communication',
    skill: 'communication',
    level: 'B2',
    title: { en: 'Hold a real conversation', ar: 'خُض محادثة حقيقية' },
    minutes: 30,
    intro: {
      en: 'At B2 you can already say what you think. Communication is the next step: structuring your ideas so people can follow you, keeping a conversation alive with questions, and disagreeing without making it a fight. This lesson gives you one simple frame for opinions (PREP), phrase banks for the moves every conversation needs, and drills that turn them into habits.',
      ar: 'في مستوى B2 تستطيع أصلاً أن تقول ما تفكر فيه. التواصل هو الخطوة التالية: أن ترتّب أفكارك ليتابعك الناس، وأن تُبقي المحادثة حية بالأسئلة، وأن تختلف دون أن يتحول الاختلاف إلى مشاجرة. تمنحك هذه الدرس إطاراً بسيطاً للآراء (PREP)، وبنوك عبارات للحركات التي تحتاجها كل محادثة، وتدريبات تحوّلها إلى عادات.',
    },
    steps: [
      { en: 'PREP for opinions: Point — say your view in one sentence. Reason — say why. Example — give one real example. Point — repeat your view in different words.', ar: 'إطار PREP للآراء: النقطة — قل رأيك في جملة واحدة. السبب — قل لماذا. المثال — أعطِ مثالاً حقيقياً واحداً. النقطة — كرر رأيك بكلمات مختلفة.' },
      { en: 'Ask before you answer: one follow-up question (“What makes you say that?”) buys you time and makes the other person feel heard.', ar: 'اسأل قبل أن تجيب: سؤال متابعة واحد («ما الذي يجعلك تقول ذلك؟») يمنحك الوقت ويجعل الطرف الآخر يشعر أنك تسمعه.' },
      { en: 'Disagree in three moves: acknowledge (“I see your point”), soften (“but I wonder if…”), then give your view with PREP.', ar: 'اختلف في ثلاث حركات: اعترف («أفهم وجهة نظرك»)، لطّف («لكن أتساءل إن…»)، ثم أعطِ رأيك بإطار PREP.' },
      { en: 'Buy time honestly: “Let me think about that for a second” sounds far better than a long silence or a rushed answer.', ar: 'اكسب الوقت بصدق: «دعني أفكر في ذلك لثانية» تبدو أفضل بكثير من صمت طويل أو إجابة متسرعة.' },
      { en: 'Close topics gracefully: summarise what you both agreed (“So we both think…”) before moving on.', ar: 'اختم المواضيع بلباقة: لخّص ما اتفقتما عليه («إذن كلانا يرى أن…») قبل الانتقال إلى غيره.' },
    ],
    phrases: [
      { en: 'The way I see it…', ar: 'من وجهة نظري…' },
      { en: 'I take your point, but…', ar: 'أفهم وجهة نظرك، لكن…' },
      { en: 'I’d go along with that, as long as…', ar: 'أوافق على ذلك، بشرط أن…' },
      { en: 'I see it slightly differently.', ar: 'أرى الأمر بصورة مختلفة قليلاً.' },
      { en: 'Building on what you said…', ar: 'بناءً على ما قلته…' },
      { en: 'What makes you say that?', ar: 'ما الذي يجعلك تقول ذلك؟' },
      { en: 'Could you give me an example?', ar: 'هل تستطيع أن تعطيني مثالاً؟' },
      { en: 'How did that work out in the end?', ar: 'وكيف انتهى الأمر في النهاية؟' },
      { en: 'Let me think about that for a second.', ar: 'دعني أفكر في ذلك لثانية.' },
      { en: 'That’s a good question. I’d say…', ar: 'هذا سؤال جيد. أقول إن…' },
      { en: 'If I understood you correctly…', ar: 'إذا فهمتك بصورة صحيحة…' },
      { en: 'So we both agree that…', ar: 'إذن كلانا متفق على أن…' },
    ],
    exercises: [
      {
        id: 'comm-opinion',
        title: { en: 'The opinion ladder', ar: 'سلّم الآراء' },
        minutes: 10,
        instructions: {
          en: 'Pick one prompt. Speak about it for 30 seconds, rest, then speak on the same prompt for 1 minute, then for 2 minutes — climbing the ladder. Use PREP every time and record the 2-minute round. If you get stuck, use a buying-time phrase, never silence.',
          ar: 'اختر سؤالاً واحداً. تحدث عنه 30 ثانية، استرح، ثم تحدث عن السؤال نفسه دقيقة واحدة، ثم دقيقتين — صاعداً السلّم. استخدم إطار PREP في كل مرة وسجّل جولة الدقيقتين. إذا علقت، استخدم عبارة لكسب الوقت، ولا تصمت أبداً.',
        },
        prompts: [
          { en: 'Should companies move to a four-day working week?', ar: 'هل ينبغي للشركات الانتقال إلى أسبوع عمل من أربعة أيام؟' },
          { en: 'Is artificial intelligence a threat or an opportunity for young workers?', ar: 'هل الذكاء الاصطناعي تهديد أم فرصة للعمال الشباب؟' },
          { en: 'Should university education be free for everyone?', ar: 'هل ينبغي أن يكون التعليم الجامعي مجانياً للجميع؟' },
        ],
      },
      {
        id: 'comm-roleplay',
        title: { en: 'Role-play cards', ar: 'بطاقات لعب الأدوار' },
        minutes: 12,
        instructions: {
          en: 'Pick a card. Read your goal, then play the scene aloud — both parts if you are alone, or with a partner if you can. The scene only counts if you use at least three phrases from the phrase bank above.',
          ar: 'اختر بطاقة. اقرأ هدفك، ثم مثّل المشهد بصوت عالٍ — الدورين إن كنت وحدك، أو مع شريك إن استطعت. لا يُحتسب المشهد إلا إذا استخدمت ثلاث عبارات على الأقل من بنك العبارات أعلاه.',
        },
        prompts: [
          { en: 'Card 1 — Team meeting: the project is two weeks late. Your goal: explain the delay honestly and agree a new deadline. Useful phrases: “The way I see it…”, “Building on what you said…”, “So we both agree that…”', ar: 'البطاقة 1 — اجتماع فريق: تأخر المشروع أسبوعين. هدفك: اشرح التأخير بصدق واتفق على موعد جديد. عبارات مفيدة: «من وجهة نظري…»، «بناءً على ما قلته…»، «إذن كلانا متفق على أن…»' },
          { en: 'Card 2 — Client phone call: a client is unhappy with a bill. Your goal: calm them down, check the facts, and promise one clear next step. Useful phrases: “If I understood you correctly…”, “Could you give me an example?”, “Let me think about that for a second.”', ar: 'البطاقة 2 — مكالمة مع عميل: عميل غير راضٍ عن فاتورة. هدفك: تهدئته، والتحقق من الحقائق، والوعد بخطوة تالية واحدة واضحة. عبارات مفيدة: «إذا فهمتك بصورة صحيحة…»، «هل تستطيع أن تعطيني مثالاً؟»، «دعني أفكر في ذلك لثانية»' },
          { en: 'Card 3 — A polite complaint: your hotel room is noisy and the air conditioning is broken. Your goal: complain firmly but politely and get a different room tonight. Useful phrases: “I take your point, but…”, “I see it slightly differently.”, “I’d go along with that, as long as…”', ar: 'البطاقة 3 — شكوى مهذبة: غرفتك في الفندق صاخبة والمكيّف معطّل. هدفك: اشتِك بحزم وأدب واحصل على غرفة مختلفة الليلة. عبارات مفيدة: «أفهم وجهة نظرك، لكن…»، «أرى الأمر بصورة مختلفة قليلاً»، «أوافق على ذلك، بشرط أن…»' },
        ],
      },
      {
        id: 'comm-followup',
        title: { en: 'The follow-up question drill', ar: 'تدريب أسئلة المتابعة' },
        minutes: 8,
        instructions: {
          en: 'For each statement, reply with ONE follow-up question before you say anything about yourself — then keep the conversation going for two more exchanges. Good follow-ups start with What, How, Why, or “Tell me more about…”',
          ar: 'لكل عبارة، أجب بسؤال متابعة واحد قبل أن تقول أي شيء عن نفسك — ثم واصل المحادثة لتبادلين إضافيين. أسئلة المتابعة الجيدة تبدأ بـ: ماذا، كيف، لماذا، أو «حدثني أكثر عن…»',
        },
        prompts: [
          { en: '“I’ve just moved to a new city for work.”', ar: '«انتقلت للتو إلى مدينة جديدة من أجل العمل.»' },
          { en: '“We’re thinking of opening a small café.”', ar: '«نفكر في افتتاح مقهى صغير.»' },
          { en: '“I failed my driving test for the third time.”', ar: '«رسبت في اختبار القيادة للمرة الثالثة.»' },
          { en: '“My brother has started running marathons.”', ar: '«بدأ أخي يركض في سباقات الماراثون.»' },
          { en: '“The course turned out to be much harder than I expected.”', ar: '«تبيّن أن الدورة أصعب بكثير مما توقعت.»' },
        ],
      },
    ],
  },
];

/** Lessons for one skill (all lessons here are written for B2). */
export const lessonsFor = (skill) => LESSONS.filter((l) => l.skill === skill);
