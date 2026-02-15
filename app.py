from flask import Flask, request, jsonify, render_template, send_file
from flask_cors import CORS
import random
import re
from gtts import gTTS
import base64
import os
import tempfile
import uuid

app = Flask(__name__)
CORS(app)

# Create downloads folder if not exists
DOWNLOAD_FOLDER = 'downloads'
if not os.path.exists(DOWNLOAD_FOLDER):
    os.makedirs(DOWNLOAD_FOLDER)

# Comprehensive Urdu phrases dictionary
URDU_PHRASES = {
    # Greetings
    "hello": "السلام علیکم",
    "hi": "ہائے",
    "good morning": "صبح بخیر",
    "good evening": "شام بخیر",
    "good night": "شب بخیر",
    "how are you": "آپ کیسے ہیں",
    "i am fine": "میں ٹھیک ہوں",
    "whats up": "کیا حال ہے",
    "welcome": "خوش آمدید",
    "bye": "خدا حافظ",
    "see you later": "پھر ملیں گے",
    
    # Emotions
    "i love you": "میں آپ سے محبت کرتا ہوں",
    "i miss you": "مجھے آپ کی یاد آتی ہے",
    "i like you": "آپ مجھے پسند ہیں",
    "i hate you": "مجھے آپ سے نفرت ہے",
    "happy": "خوش",
    "sad": "اداس",
    "angry": "غصہ",
    "excited": "پرجوش",
    "tired": "تھکا ہوا",
    "bored": "اکتاہٹ",
    
    # Common words
    "thank you": "شکریہ",
    "thanks": "شکریہ",
    "sorry": "معاف کیجئے",
    "please": "براہ کرم",
    "yes": "ہاں",
    "no": "نہیں",
    "maybe": "شاید",
    "ok": "ٹھیک ہے",
    "good": "اچھا",
    "bad": "برا",
    "beautiful": "خوبصورت",
    "handsome": "خوبصورت",
    "cute": "پیارا",
    "amazing": "حیرت انگیز",
    "wonderful": "شاندار",
    
    # Family
    "mother": "ماں",
    "father": "باپ",
    "brother": "بھائی",
    "sister": "بہن",
    "son": "بیٹا",
    "daughter": "بیٹی",
    "wife": "بیوی",
    "husband": "شوہر",
    "friend": "دوست",
    "family": "خاندان",
    
    # Questions
    "what": "کیا",
    "why": "کیوں",
    "when": "کب",
    "where": "کہاں",
    "who": "کون",
    "how": "کیسے",
    "how much": "کتنا",
    
    # Time
    "today": "آج",
    "tomorrow": "کل",
    "yesterday": "گزشتہ کل",
    "now": "ابھی",
    "later": "بعد میں",
    "morning": "صبح",
    "afternoon": "دوپہر",
    "evening": "شام",
    "night": "رات",
    
    # Business
    "meeting": "میٹنگ",
    "work": "کام",
    "office": "دفتر",
    "money": "پیسہ",
    "price": "قیمت",
    "deal": "سودا",
    "business": "کاروبار",
    "company": "کمپنی",
    "customer": "گاہک",
    "service": "خدمت"
}

# Urdu poetry lines
URDU_POETRY = [
    "دل لگے گا تو مزا آئے گا ورنہ کیا رکھا ہے",
    "محبت میں یہی ہوتا ہے کسی کو یاد رکھا جائے",
    "تم یاد آئے تو دل کو قرار آ گیا",
    "ہم سے پہلے بھی محبت کی گئی ہے",
    "اب کے ہم بچھڑے تو شاید کبھی خوابوں میں ملیں",
    "شام کے سناٹے میں دل کی دھڑکن سنائی دیتی ہے",
    "آنکھوں میں بسے ہو دل میں ہو تم",
    "زندگی کا سفر ہے یہ کس طرح گزرے گی",
    "دل کے سمندر میں اترنے والے",
    "محبت صرف ایک لفظ نہیں ایک احساس ہے",
    "ہر پل تجھے یاد کیا میں نے",
    "دل تو بچپن کا ہے سوچیں جوان ہو گئیں",
    "راتیں کاٹے گی تو سمجھ آئے گی",
    "مسافروں کا کوئی ٹھکانہ نہیں ہوتا",
    "خواب وہی ہوتے ہیں جو آنکھیں بند کر کے دیکھے جائیں"
]

# Urdu romantic lines
URDU_ROMANTIC = [
    "تم میرے دل کی دھڑکن ہو",
    "تمہارے بغیر زندگی ادھوری ہے",
    "تم سے مل کر دل کو قرار آیا",
    "تمہاری آنکھوں میں کھو جاؤں",
    "تم مسکراؤ تو دل خوش ہو جاتا ہے",
    "تم ہو تو دنیا ہے",
    "تم یاد آئے تو دن بن گیا",
    "تمہاری باتوں میں وہ مٹھاس ہے",
    "دل تم پہ آیا ہے تو کیا کریں",
    "تم سے محبت ہے تم سے محبت ہے"
]

# Available tones
TONES = {
    "professional": {
        "name": "👔 Professional",
        "description": "Formal business tone",
        "emoji": "👔",
        "language": "en"
    },
    "sassy": {
        "name": "💅 Sassy Teenager",
        "description": "Modern slang",
        "emoji": "💅",
        "language": "en"
    },
    "urdu_basic": {
        "name": "🇵🇰 اردو (Basic)",
        "description": "Urdu translation",
        "emoji": "🇵🇰",
        "language": "ur"
    },
    "urdu_poetry": {
        "name": "💕 اردو شاعری",
        "description": "Romantic Urdu poetry",
        "emoji": "💕",
        "language": "ur"
    },
    "urdu_romantic": {
        "name": "🌹 رومانوی اردو",
        "description": "Romantic Urdu lines",
        "emoji": "🌹",
        "language": "ur"
    },
    "urdu_mixed": {
        "name": "🗣️ اردو انگلش",
        "description": "Mix of Urdu and English",
        "emoji": "🗣️",
        "language": "ur"
    }
}

def translate_to_urdu_detailed(text):
    """Advanced Urdu translation with phrase matching"""
    text_lower = text.lower()
    words = text_lower.split()
    
    # Check for exact phrase matches
    for eng, urdu in URDU_PHRASES.items():
        if eng in text_lower:
            return urdu
    
    # Check for individual words
    urdu_words = []
    for word in words[:5]:  # First 5 words only
        found = False
        for eng, urdu in URDU_PHRASES.items():
            if eng in word or word in eng:
                urdu_words.append(urdu)
                found = True
                break
        if not found:
            urdu_words.append(word)
    
    if urdu_words:
        return " ".join(urdu_words) + " - اردو میں"
    
    # Default fallback
    return random.choice(URDU_POETRY)

def get_urdu_poetry():
    """Return random Urdu poetry line"""
    return random.choice(URDU_POETRY)

def get_urdu_romantic():
    """Return random Urdu romantic line"""
    return random.choice(URDU_ROMANTIC)

def get_urdu_mixed(text):
    """Create Urdu-English mixed text"""
    urdu_part = random.choice(URDU_POETRY)
    return f"{text} - {urdu_part}"

def transform_professional(text):
    text = re.sub(r'\bi think\b', 'Based on analysis', text, flags=re.IGNORECASE)
    text = re.sub(r'\bmaybe\b', 'potentially', text, flags=re.IGNORECASE)
    return f"📊 {text}"

def transform_sassy(text):
    sassy_phrases = [
        f"OMG, like, {text.lower()}?! That's literally everything! 💅",
        f"Bestie, {text}?? The audacity! 😱",
    ]
    return random.choice(sassy_phrases)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "version": "3.0",
        "message": "Brand Voice Rewriter with Urdu Voice Support"
    })

@app.route('/api/tones', methods=['GET'])
def get_tones():
    tones_list = []
    for key, value in TONES.items():
        tones_list.append({
            "id": key,
            "name": value["name"],
            "description": value["description"],
            "emoji": value["emoji"],
            "language": value["language"]
        })
    return jsonify(tones_list)

@app.route('/api/rewrite', methods=['POST'])
def rewrite():
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        tone = data.get('tone', 'professional')
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
        
        # Apply transformation based on tone
        if tone == "professional":
            rewritten = transform_professional(text)
        elif tone == "sassy":
            rewritten = transform_sassy(text)
        elif tone == "urdu_basic":
            rewritten = translate_to_urdu_detailed(text)
        elif tone == "urdu_poetry":
            rewritten = get_urdu_poetry()
        elif tone == "urdu_romantic":
            rewritten = get_urdu_romantic()
        elif tone == "urdu_mixed":
            rewritten = get_urdu_mixed(text)
        else:
            rewritten = text
        
        return jsonify({
            "success": True,
            "original": text,
            "rewritten": rewritten,
            "tone": tone,
            "tone_name": TONES[tone]["name"],
            "language": TONES[tone]["language"]
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/generate-voice', methods=['POST'])
def generate_voice():
    """Generate voice and return as base64 for browser playback"""
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        language = data.get('language', 'en')
        gender = data.get('gender', 'female')
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
        
        # Map language codes for gTTS
        lang_map = {
            'en': 'en',
            'ur': 'ur',
            'hi': 'hi',
            'pa': 'hi'
        }
        
        tts_lang = lang_map.get(language, 'en')
        
        # Generate audio
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp_file:
            temp_filename = tmp_file.name
        
        # For Urdu, use slightly slower speed for better clarity
        tts = gTTS(text=text, lang=tts_lang, slow=(language=='ur'))
        tts.save(temp_filename)
        
        # Convert to base64
        with open(temp_filename, "rb") as f:
            audio_base64 = base64.b64encode(f.read()).decode('utf-8')
        
        # Clean up
        os.unlink(temp_filename)
        
        return jsonify({
            "success": True,
            "audio": audio_base64,
            "format": "mp3",
            "language": language
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/download-voice', methods=['POST'])
def download_voice():
    """Generate voice and return as downloadable MP3 file"""
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        language = data.get('language', 'en')
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
        
        # Map language codes
        lang_map = {
            'en': 'en',
            'ur': 'ur',
            'hi': 'hi',
            'pa': 'hi'
        }
        
        tts_lang = lang_map.get(language, 'en')
        
        # Generate unique filename
        filename = f"voice_{uuid.uuid4().hex[:8]}.mp3"
        filepath = os.path.join(DOWNLOAD_FOLDER, filename)
        
        # Generate and save audio
        tts = gTTS(text=text, lang=tts_lang, slow=(language=='ur'))
        tts.save(filepath)
        
        # Send file
        return send_file(
            filepath,
            as_attachment=True,
            download_name=f"brand_voice_{language}.mp3",
            mimetype="audio/mpeg"
        )
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("=" * 60)
    print("🚀 Brand Voice Rewriter with Urdu Voice Support")
    print(f"📡 Server: http://localhost:5000")
    print(f"🎨 Urdu Tones Available:")
    print("   • اردو (Basic) - Urdu translation")
    print("   • اردو شاعری - Urdu poetry")
    print("   • رومانوی اردو - Romantic lines")
    print("   • اردو انگلش - Mixed text")
    print(f"🗣️ Voice: Female/Male with MP3 Download")
    print("=" * 60)
    app.run(debug=True, port=5000)
