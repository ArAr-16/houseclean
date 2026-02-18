import React from "react";
import './Blog.css';
import CleaningHacks from './CleaningHacks.jpg';
import BenefitsofProfessional from './BenefitsofProfessional.jpg';
import seasonalspring from './seasonalspring.jpg';
import EcoFriendly from './EcoFriendly.jpg';
import officespace from './officespace.jpg';
import HolidayCleaning from './HolidayCleaning.jpg';

function Blog() {
  const blogPosts = [
    {
      title: 'Top 10 Cleaning Hacks for Busy Families',
      date: 'February 5, 2026',
      excerpt: 'Discover simple and effective cleaning tips that save time and keep your home sparkling. From organizing closets to quick kitchen cleanups, these hacks are perfect for families on the go.',
      image: CleaningHacks,
      link: '#'
    },
    {
      title: 'The Benefits of Professional House Cleaning',
      date: 'January 28, 2026',
      excerpt: 'Learn why hiring professional cleaners can improve your health, save time, and increase your home\'s value. We break down the advantages of professional services.',
      image: BenefitsofProfessional,
      link: '#'
    },
    {
      title: 'Seasonal Cleaning: Spring Refresh Guide',
      date: 'January 15, 2026',
      excerpt: 'Spring is the perfect time for deep cleaning. Follow our comprehensive guide to declutter, clean, and organize your home for the warmer months ahead.',
      image: seasonalspring,
      link: '#'
    },
    {
      title: 'Eco-Friendly Cleaning Products You Should Try',
      date: 'January 2, 2026',
      excerpt: 'Explore natural and sustainable cleaning alternatives that are safe for your family and the environment. Say goodbye to harsh chemicals!',
      image: EcoFriendly,
      link: '#'
    },
    {
      title: 'Maintaining a Clean Office Space',
      date: 'December 20, 2025',
      excerpt: 'Tips for keeping your workspace organized and hygienic. A clean office boosts productivity and creates a better work environment for everyone.',
      image: officespace,
      link: '#'
    },
    {
      title: 'Holiday Cleaning Checklist',
      date: 'December 10, 2025',
      excerpt: 'Prepare your home for the holidays with our ultimate cleaning checklist. From dusting decorations to deep cleaning guest rooms, we\'ve got you covered.',
      image: HolidayCleaning,
      link: '#'
    }
  ];

  return (
    <div className="blog">
      <h1>Our Blog</h1>
      <p className="blog-intro">Read tips, stories, and expert advice about keeping your home and office clean and organized.</p>
      <div className="blog-posts">
        {blogPosts.map((post, index) => (
          <div key={index} className="blog-post">
            <img src={post.image} alt={post.title} />
            <div className="blog-post-content">
              <h2>{post.title}</h2>
              <p className="blog-post-date">{post.date}</p>
              <p>{post.excerpt}</p>
              <a href={post.link} className="read-more">Read More</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Blog;
