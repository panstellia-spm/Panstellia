export const categoryLabelMap = {
  Gold: 'Luxe Ring',
  Silver: 'Royal Bracelets',
  'Lux Wear': 'Elite Series',
  'Party Wear': 'Piercings',
  'Elegant Spark': 'Elegant Spark',
};

export const getCategoryLabel = (category) => categoryLabelMap[category] || category;
