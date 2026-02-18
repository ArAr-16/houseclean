import React from "react";
import './Services.css';
import housecleaning from './housecleaning.jpeg';
import OfficeCleaning from './OfficeCleaning.jpg';
import Deepcleaning from './Deepcleaning.jpg';
import schedule from './schedule.jpg';



function Services() {
  const services = [
    {
      title: 'House Cleaning',
      description: 'Professional cleaning services for your home, ensuring a spotless and healthy environment. Our experienced team uses eco-friendly products to clean every corner of your house.',
      image: housecleaning
    },
    {
      title: 'Office Cleaning',
      description: 'Comprehensive cleaning for offices and workplaces to maintain productivity and a professional atmosphere. We handle desks, floors, restrooms, and common areas.',
      image: OfficeCleaning
    },
    {
      title: 'Deep Cleaning',
      description: 'Thorough deep cleaning services for a complete refresh of your space. This includes cleaning behind furniture, inside appliances, and detailed sanitization.',
      image: Deepcleaning
    },
    {
      title: 'Schedule Management',
      description: 'Efficient scheduling and management of your cleaning appointments for maximum convenience. We offer flexible timing and recurring service options.',
      image: schedule
    }
  ];

  return (
    <div className="services">
      <h1>Our Services</h1>
      <div className="services-grid">
        {services.map((service, index) => (
          <div key={index} className="service-card">
            <img src={service.image} alt={service.title} />
            <h2>{service.title}</h2>
            <p>{service.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Services;
