// Utility function to fix image URLs
export function getImageUrl(imageUrl) {
  if (!imageUrl) return '/images/placeholder.svg';
  
  // If it's already a relative path, return as is
  if (imageUrl.startsWith('/')) {
    return imageUrl;
  }
  
  // If it's a server URL, extract the filename and map to public folder
  if (imageUrl.includes('/assets/')) {
    const filename = imageUrl.split('/assets/')[1];
    // Map the old filenames to the new ones in public/images
    const filenameMap = {
      'Layer Mash.png': 'Layer_Mash.png',
      'Poultry Premix.png': 'Poultry_Premix.png',
      'Broiler Feed.png': 'Broiler_Feed.png',
      'Poultry Vaccine.png': 'Poultry_Vaccine.png',
      'Poultry Antibiotic.png': 'Poultry_Antibiotic.png',
      'Poultry Dewormer.png': 'Poultry_Dewormer.png',
      'Automatic Poultry Drinke.png': 'Automatic_Poultry_Drinker.png', // Fix typo
      'Poultry Feeder.png': 'Poultry_Feeder.png',
      'Poultry Netting.png': 'Poultry_Netting.png'
    };
    
    const mappedFilename = filenameMap[filename] || filename;
    return `/images/${mappedFilename}`;
  }
  
  // For any other URL, return as is
  return imageUrl;
}
