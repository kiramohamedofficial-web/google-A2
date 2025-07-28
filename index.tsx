import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenerativeAI } from '@google/genai';

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResult('');

    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      
      if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        throw new Error('يرجى إضافة مفتاح Gemini API في ملف .env.local');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      const prompt = `أجب على السؤال التالي باللغة العربية بشكل مفصل ومفيد: ${query}`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      setResult(text);
    } catch (err: any) {
      console.error('خطأ في البحث:', err);
      setError(err.message || 'حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const quickSearches = [
    { icon: '🤖', text: 'الذكاء الاصطناعي', query: 'ما هو الذكاء الاصطناعي؟' },
    { icon: '💻', text: 'البرمجة', query: 'كيف أتعلم البرمجة؟' },
    { icon: '🌍', text: 'العلوم', query: 'اشرح لي عن الفضاء' },
    { icon: '📚', text: 'التعليم', query: 'نصائح للدراسة الفعالة' }
  ];

  return (
    <div className="container">
      <div className="logo">G</div>
      <h1>Google Center</h1>
      <p className="subtitle">مركز البحث الذكي بالذكاء الاصطناعي</p>
      
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="اسأل أي سؤال..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
        />
      </div>
      
      <div>
        <button className="search-btn" onClick={handleSearch} disabled={loading}>
          {loading ? 'جاري البحث...' : 'بحث'}
        </button>
      </div>

      <div className="features">
        {quickSearches.map((item, index) => (
          <div 
            key={index} 
            className="feature"
            onClick={() => {
              setQuery(item.query);
              setTimeout(handleSearch, 100);
            }}
          >
            <div className="feature-icon">{item.icon}</div>
            <div className="feature-text">{item.text}</div>
          </div>
        ))}
      </div>

      {loading && <div className="loading"></div>}
      
      {error && (
        <div className="result error">
          <strong>خطأ:</strong> {error}
        </div>
      )}
      
      {result && (
        <div className="result">
          <h3>النتيجة:</h3>
          <p>{result}</p>
        </div>
      )}
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
} else {
  console.error('لم يتم العثور على عنصر root');
}