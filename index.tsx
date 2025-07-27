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
    displayError('لم يتم إنشاء أي صور. قد يكون المحتوى غير مسموح به أو أن الوصف غير واضح.');
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
  imageGallery.innerHTML = '<div class="spinner" style="display: block; margin: auto; grid-column: 1 / -1;"></div>';

  try {
    const formData = new FormData(imageForm);
    const userPrompt = formData.get('prompt') as string;
    const style = formData.get('style') as string;
    const gender = formData.get('gender') as string;
    const age = formData.get('age') as string;
    const aspectRatio = formData.get('aspect-ratio') as '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
    const numImages = parseInt(formData.get('num-images') as string, 10);
    const negativePrompt = formData.get('negative-prompt') as string;
    
    // Smart prompt construction: base prompt, then add details and style keywords
    let fullPrompt = userPrompt;

    const ageText = age !== 'any' ? age : '';
    const genderText = gender !== 'any' ? gender : '';
    const personParts = [ageText, genderText].filter(part => part.length > 0);
    if (personParts.length > 0) {
      fullPrompt += `, a ${personParts.join(' ')}`;
    }
    
    // Append style description keywords for better results
    const styleDescriptions = {
        'photorealistic': 'photorealistic, 8k, sharp focus',
        'cinematic': 'cinematic lighting, film still, movie-like',
        'anime': 'anime style, by studio ghibli, vibrant colors',
        'fantasy art': 'digital fantasy art, epic, detailed, trending on artstation',
        'watercolor': 'watercolor painting style, soft, blended',
        '3d-model': '3d render, octane render, smooth',
    };
    fullPrompt += `, ${styleDescriptions[style]}`;

    const response = await ai.models.generateImages({
      model: imagenModel,
      prompt: fullPrompt.trim(),
      config: {
        numberOfImages: numImages,
        aspectRatio: aspectRatio,
        outputMimeType: 'image/jpeg',
        // Conditionally add negative prompt if it exists
        ...(negativePrompt && { negativePrompt: negativePrompt }),
      },
    });

    renderImages(response?.generatedImages, userPrompt);

  } catch (error) {
    console.error("Error generating images:", error);
    let errorMessage = 'حدث خطأ أثناء إنشاء الصورة. يرجى المحاولة مرة أخرى.';
    if (error && typeof error === 'object' && 'message' in error) {
        // Attempt to parse a more specific error from the message if possible
        if (typeof error.message === 'string' && error.message.includes('{')) {
            try {
                const errorJson = JSON.parse(error.message.substring(error.message.indexOf('{')));
                errorMessage = errorJson.error.message || errorMessage;
            } catch (e) {
                // Ignore parsing error, use the original message
            }
        } else {
             errorMessage += ` التفاصيل: ${error.message}`;
        }
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