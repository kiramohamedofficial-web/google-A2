/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, GeneratedImage } from '@google/genai';

// Initialize the Gemini AI model
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const imagenModel = 'imagen-3.0-generate-002';

// Get DOM elements
const imageForm = document.getElementById('image-form') as HTMLFormElement;
const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
const btnText = generateBtn.querySelector('.btn-text') as HTMLSpanElement;
const spinner = generateBtn.querySelector('.spinner') as HTMLDivElement;
const imageGallery = document.getElementById('image-gallery') as HTMLDivElement;

// Function to set the loading state
function setLoading(isLoading: boolean) {
  if (isLoading) {
    generateBtn.disabled = true;
    btnText.style.opacity = '0';
    spinner.style.display = 'block';
  } else {
    generateBtn.disabled = false;
    btnText.style.opacity = '1';
    spinner.style.display = 'none';
  }
}

// Function to display errors
function displayError(message: string) {
  imageGallery.innerHTML = `<p class="error">${message}</p>`;
}

// Function to render images
function renderImages(images: GeneratedImage[], prompt: string) {
  imageGallery.innerHTML = ''; // Clear previous content

  if (!images || images.length === 0) {
    displayError('لم يتم إنشاء أي صور. قد يكون المحتوى غير مسموح به.');
    return;
  }

  images.forEach((generatedImage, index) => {
    if (generatedImage.image?.imageBytes) {
      const src = `data:image/jpeg;base64,${generatedImage.image.imageBytes}`;
      
      const card = document.createElement('div');
      card.className = 'image-card';
      
      const img = document.createElement('img');
      img.src = src;
      img.alt = `${prompt} - Image ${index + 1}`;
      
      const downloadLink = document.createElement('a');
      downloadLink.href = src;
      downloadLink.download = `generated-image-${Date.now()}.jpeg`;
      downloadLink.className = 'download-btn';
      downloadLink.textContent = 'تحميل';
      downloadLink.setAttribute('aria-label', 'Download image');

      card.appendChild(img);
      card.appendChild(downloadLink);
      imageGallery.appendChild(card);
    }
  });
}

// Handle form submission
async function handleFormSubmit(event: SubmitEvent) {
  event.preventDefault();
  setLoading(true);
  imageGallery.innerHTML = '<div class="spinner" style="display: block; margin: auto;"></div>'; // Show spinner in gallery

  try {
    const formData = new FormData(imageForm);
    const userPrompt = formData.get('prompt') as string;
    const style = formData.get('style') as string;
    const gender = formData.get('gender') as string;
    const age = formData.get('age') as string;
    
    // Construct a detailed prompt for better results
    let fullPrompt = `${style} style. `;
    if (age !== 'any' || gender !== 'any') {
        const ageText = age !== 'any' ? age : '';
        const genderText = gender !== 'any' ? gender : '';
        fullPrompt += `A photo of a ${ageText} ${genderText}. `.trim();
    }
    fullPrompt += userPrompt;

    const response = await ai.models.generateImages({
      model: imagenModel,
      prompt: fullPrompt.trim(),
      config: {
        numberOfImages: 1, // Generate 1 image for faster response
        aspectRatio: '1:1',
        personGeneration: 'allow_all', // Allow the generation of people.
        outputMimeType: 'image/jpeg',
      },
    });

    console.log('Full response:', response);
    renderImages(response?.generatedImages, userPrompt);

  } catch (error) {
    console.error("Error generating images:", error);
    let errorMessage = 'حدث خطأ أثناء إنشاء الصورة. يرجى المحاولة مرة أخرى.';
    if (error instanceof Error) {
        errorMessage += ` التفاصيل: ${error.message}`;
    }
    displayError(errorMessage);
  } finally {
    setLoading(false);
  }
}

// Attach event listener when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (imageForm) {
        imageForm.addEventListener('submit', handleFormSubmit);
    }
});
