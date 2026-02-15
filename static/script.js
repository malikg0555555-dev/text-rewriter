// State management
let currentTone = 'professional';
let tones = [];
let isProcessing = false;
let currentUtterance = null;

// DOM Elements
const inputText = document.getElementById('inputText');
const wordCount = document.getElementById('wordCount');
const charCount = document.getElementById('charCount');
const toneGrid = document.getElementById('toneGrid');
const transformBtn = document.getElementById('transformBtn');
const resultCard = document.getElementById('resultCard');
const resultBox = document.getElementById('resultBox');
const resultToneBadge = document.getElementById('resultToneBadge');
const originalWordCount = document.getElementById('originalWordCount');
const rewrittenWordCount = document.getElementById('rewrittenWordCount');
const loadingSpinner = document.getElementById('loadingSpinner');
const copyBtn = document.getElementById('copyBtn');
const voiceBtn = document.getElementById('voiceBtn');
const stopBtn = document.getElementById('stopBtn');
const voiceLanguage = document.getElementById('voiceLanguage');
const voiceGender = document.getElementById('voiceGender');
const voiceSpeed = document.getElementById('voiceSpeed');
const voicePitch = document.getElementById('voicePitch');
const speedValue = document.getElementById('speedValue');
const pitchValue = document.getElementById('pitchValue');
const toast = document.getElementById('toast');
const themeToggle = document.getElementById('themeToggle');
const inputLanguage = document.getElementById('inputLanguage');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadTones();
    updateWordCount();
    setupEventListeners();
    checkBackendHealth();
    loadVoices();
});

// Load available voices
function loadVoices() {
    if ('speechSynthesis' in window) {
        speechSynthesis.getVoices();
    }
}

// Load tones from backend
async function loadTones() {
    try {
        const response = await fetch('/api/tones');
        tones = await response.json();
        renderTones();
        document.getElementById('toneCount').textContent = `${tones.length} tones`;
    } catch (error) {
        console.error('Failed to load tones:', error);
        showToast('Failed to load tones');
    }
}

// Render tone buttons
function renderTones() {
    toneGrid.innerHTML = tones.map(tone => `
        <button class="tone-btn ${tone.id === currentTone ? 'active' : ''}" 
                onclick="selectTone('${tone.id}')">
            <span class="tone-emoji">${tone.emoji}</span>
            <span class="tone-name">${tone.name}</span>
            <span class="tone-desc">${tone.description}</span>
        </button>
    `).join('');
}

// Select tone
window.selectTone = function(toneId) {
    currentTone = toneId;
    document.querySelectorAll('.tone-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    // Update voice language based on tone
    const selectedTone = tones.find(t => t.id === toneId);
    if (selectedTone && selectedTone.language) {
        voiceLanguage.value = selectedTone.language;
    }
};

// Update word count
function updateWordCount() {
    const text = inputText.value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    
    wordCount.textContent = words;
    charCount.textContent = chars;
}

// Setup event listeners
function setupEventListeners() {
    inputText.addEventListener('input', updateWordCount);
    transformBtn.addEventListener('click', transformText);
    copyBtn.addEventListener('click', copyToClipboard);
    voiceBtn.addEventListener('click', listenToText);
    stopBtn.addEventListener('click', stopSpeaking);
    themeToggle.addEventListener('click', toggleTheme);
    
    voiceSpeed.addEventListener('input', () => {
        speedValue.textContent = voiceSpeed.value + 'x';
    });
    
    voicePitch.addEventListener('input', () => {
        pitchValue.textContent = voicePitch.value + 'x';
    });
    
    // Example buttons
    document.querySelectorAll('.example-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const example = btn.dataset.example;
            setExampleText(example);
        });
    });
}

// Transform text
async function transformText() {
    const text = inputText.value.trim();
    
    if (!text) {
        showToast('Please enter some text!');
        inputText.focus();
        return;
    }
    
    if (isProcessing) return;
    
    try {
        isProcessing = true;
        transformBtn.disabled = true;
        loadingSpinner.style.display = 'inline-block';
        
        const response = await fetch('/api/rewrite', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                tone: currentTone
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayResult(data);
        } else {
            showToast(data.error || 'Failed to transform');
        }
    } catch (error) {
        console.error('Transformation failed:', error);
        showToast('Failed to connect to server');
    } finally {
        isProcessing = false;
        transformBtn.disabled = false;
        loadingSpinner.style.display = 'none';
    }
}

// Display result
function displayResult(data) {
    resultBox.textContent = data.rewritten;
    resultToneBadge.textContent = data.tone_name;
    originalWordCount.textContent = data.word_count_original || inputText.value.trim().split(/\s+/).length;
    rewrittenWordCount.textContent = data.rewritten.split(/\s+/).length;
    
    // Set text direction for Urdu/Hindi
    if (data.language === 'ur' || data.language === 'hi' || data.language === 'pa') {
        resultBox.setAttribute('dir', 'rtl');
        resultBox.style.fontFamily = "'Noto Nastaliq Urdu', serif";
    } else {
        resultBox.setAttribute('dir', 'ltr');
        resultBox.style.fontFamily = 'inherit';
    }
    
    resultCard.style.display = 'block';
    resultCard.scrollIntoView({ behavior: 'smooth' });
}

// Set example text
function setExampleText(type) {
    const examples = {
        business: "We need to schedule a meeting to discuss the Q4 results.",
        urdu: "دل لگے گا تو مزا آئے گا ورنہ کیا رکھا ہے",
        hindi: "ये दिल तुम बिन कहीं लगता नहीं",
        punjabi: "ਸਾਡਾ ਪਿਆਰ ਤੇਰੇ ਨਾਲ ਹੈ"
    };
    
    inputText.value = examples[type] || examples.business;
    updateWordCount();
}

// Listen to text with speech synthesis
function listenToText() {
    const text = resultBox.textContent;
    
    if (!text) {
        showToast('No text to speak!');
        return;
    }
    
    if (!('speechSynthesis' in window)) {
        showToast('Speech synthesis not supported');
        return;
    }
    
    // Stop any ongoing speech
    stopSpeaking();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = parseFloat(voiceSpeed.value);
    utterance.pitch = parseFloat(voicePitch.value);
    utterance.lang = voiceLanguage.value;
    
    // Select voice based on gender and language
    const voices = speechSynthesis.getVoices();
    let selectedVoice = null;
    
    if (voiceGender.value === 'female') {
        selectedVoice = voices.find(v => 
            v.lang.includes(voiceLanguage.value) && 
            (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google UK'))
        );
    } else {
        selectedVoice = voices.find(v => 
            v.lang.includes(voiceLanguage.value) && 
            (v.name.includes('Male') || v.name.includes('Daniel'))
        );
    }
    
    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }
    
    // Store utterance for stop functionality
    currentUtterance = utterance;
    
    // Show stop button
    voiceBtn.style.display = 'none';
    stopBtn.style.display = 'flex';
    
    utterance.onend = () => {
        voiceBtn.style.display = 'flex';
        stopBtn.style.display = 'none';
        currentUtterance = null;
    };
    
    utterance.onerror = () => {
        voiceBtn.style.display = 'flex';
        stopBtn.style.display = 'none';
        currentUtterance = null;
        showToast('Error playing speech');
    };
    
    speechSynthesis.speak(utterance);
}

// Stop speaking
function stopSpeaking() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    voiceBtn.style.display = 'flex';
    stopBtn.style.display = 'none';
    currentUtterance = null;
}

// Copy to clipboard
async function copyToClipboard() {
    const text = resultBox.textContent;
    
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard! ✨');
        
        copyBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            copyBtn.style.transform = '';
        }, 200);
    } catch (err) {
        showToast('Failed to copy');
    }
}

// Toggle theme
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    themeToggle.innerHTML = newTheme === 'dark' ? 
        '<i class="fas fa-sun"></i>' : 
        '<i class="fas fa-moon"></i>';
    
    localStorage.setItem('theme', newTheme);
}

// Check backend health
async function checkBackendHealth() {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        
        if (data.status === 'healthy') {
            console.log('✅ Backend connected');
        }
    } catch (error) {
        console.error('❌ Backend not reachable');
        showToast('⚠️ Backend server not running!');
    }
}

// Show toast
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.innerHTML = savedTheme === 'dark' ? 
        '<i class="fas fa-sun"></i>' : 
        '<i class="fas fa-moon"></i>';
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        transformText();
    }
    
    if (e.key === 'Escape') {
        stopSpeaking();
    }
});
// Add these variables at the top
const downloadBtn = document.getElementById('downloadBtn');

// Add this in setupEventListeners function
downloadBtn.addEventListener('click', downloadVoice);

// Add this new function
async function downloadVoice() {
    const text = resultBox.textContent;
    const language = voiceLanguage.value;
    
    if (!text) {
        showToast('No text to download!');
        return;
    }
    
    try {
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
        
        const response = await fetch('/api/download-voice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                language: language
            })
        });
        
        if (response.ok) {
            // Get the blob from response
            const blob = await response.blob();
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `brand_voice_${language}_${new Date().getTime()}.mp3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showToast('✅ MP3 downloaded successfully!');
        } else {
            showToast('❌ Download failed');
        }
    } catch (error) {
        console.error('Download failed:', error);
        showToast('❌ Download failed');
    } finally {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download MP3';
    }
}

// Update listenToText function for better Urdu support
function listenToText() {
    const text = resultBox.textContent;
    const language = voiceLanguage.value;
    
    if (!text) {
        showToast('No text to speak!');
        return;
    }
    
    if (!('speechSynthesis' in window)) {
        showToast('Speech synthesis not supported');
        return;
    }
    
    stopSpeaking();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = parseFloat(voiceSpeed.value);
    utterance.pitch = parseFloat(voicePitch.value);
    utterance.lang = language;
    
    // Get all available voices
    const voices = speechSynthesis.getVoices();
    console.log('Available voices:', voices.map(v => v.name + ' (' + v.lang + ')'));
    
    // Select voice based on language and gender
    let selectedVoice = null;
    
    if (language === 'ur') {
        // For Urdu, try to find a suitable voice
        if (voiceGender.value === 'female') {
            selectedVoice = voices.find(v => 
                v.lang.includes('ur') && (v.name.includes('Female') || v.name.includes('Zira'))
            ) || voices.find(v => v.lang.includes('ur'));
        } else {
            selectedVoice = voices.find(v => 
                v.lang.includes('ur') && (v.name.includes('Male') || v.name.includes('Daniel'))
            ) || voices.find(v => v.lang.includes('ur'));
        }
    } else {
        // For English/Hindi
        const genderFilter = voiceGender.value === 'female' ? 
            ['Female', 'Samantha', 'Google UK'] : 
            ['Male', 'Daniel'];
        
        selectedVoice = voices.find(v => 
            v.lang.includes(language) && 
            genderFilter.some(g => v.name.includes(g))
        ) || voices.find(v => v.lang.includes(language));
    }
    
    if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('Selected voice:', selectedVoice.name);
    } else {
        console.log('Using default voice for', language);
    }
    
    currentUtterance = utterance;
    
    voiceBtn.style.display = 'none';
    stopBtn.style.display = 'flex';
    
    utterance.onend = () => {
        voiceBtn.style.display = 'flex';
        stopBtn.style.display = 'none';
        currentUtterance = null;
    };
    
    utterance.onerror = (event) => {
        console.error('Speech error:', event);
        voiceBtn.style.display = 'flex';
        stopBtn.style.display = 'none';
        currentUtterance = null;
        showToast('Error playing speech');
    };
    
    speechSynthesis.speak(utterance);
}

// Add CSS for download button
const style = document.createElement('style');
style.textContent = `
    .download-btn {
        background: #4CAF50 !important;
    }
    .download-btn:hover {
        background: #45a049 !important;
    }
    .download-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;
document.head.appendChild(style);