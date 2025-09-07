import React from 'react';
import { CircularGallery, GalleryItem } from './ui/circular-gallery';

const carouselExamples: GalleryItem[] = [
  {
    common: 'Marketing Tips',
    binomial: 'Social Media Strategy',
    photo: {
      url: 'https://images.pexels.com/photos/3184325/pexels-photo-3184325.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
      text: 'Marketing tips carousel for social media',
      pos: '50% 40%',
      by: 'Minimalist'
    }
  },
  {
    common: 'Product Launch',
    binomial: 'Brand Announcement',
    photo: {
      url: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
      text: 'Product launch carousel design',
      pos: '50% 30%',
      by: 'Bold'
    }
  },
  {
    common: 'Business Tips',
    binomial: 'Entrepreneurship Guide',
    photo: {
      url: 'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
      text: 'Business tips and strategies',
      pos: '50% 35%',
      by: 'Elegant'
    }
  },
  {
    common: 'Design Principles',
    binomial: 'Visual Guidelines',
    photo: {
      url: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
      text: 'Design principles carousel',
      pos: '50% 45%',
      by: 'Modern'
    }
  },
  {
    common: 'Brand Story',
    binomial: 'Company Journey',
    photo: {
      url: 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
      text: 'Brand storytelling carousel',
      pos: '50% 40%',
      by: 'Elegant'
    }
  },
  {
    common: 'Growth Hacking',
    binomial: 'Business Scaling',
    photo: {
      url: 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
      text: 'Growth hacking strategies',
      pos: '50% 35%',
      by: 'Dynamic'
    }
  },
  {
    common: 'Content Strategy',
    binomial: 'Social Media Planning',
    photo: {
      url: 'https://images.pexels.com/photos/3184311/pexels-photo-3184311.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
      text: 'Content strategy carousel',
      pos: '50% 40%',
      by: 'Clean'
    }
  },
  {
    common: 'Sales Funnel',
    binomial: 'Customer Journey',
    photo: {
      url: 'https://images.pexels.com/photos/3184287/pexels-photo-3184287.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
      text: 'Sales funnel optimization',
      pos: '50% 45%',
      by: 'Professional'
    }
  }
];

const CircularGalleryDemo = () => {
  return (
    <div className="w-full h-[600px] relative">
      <div className="absolute inset-0">
        <CircularGallery items={carouselExamples} radius={350} />
      </div>
    </div>
  );
};

export default CircularGalleryDemo;