
import React from "react";
import HeroSection from "@/components/home/HeroSection";
import FeaturedProfessionals from "@/components/home/FeaturedProfessionals";
import CategoriesSection from "@/components/home/CategoriesSection";
import ProfessionalCTA from "@/components/home/ProfessionalCTA";

const HomePage = () => {
  return (
    <>
      <HeroSection />
      <FeaturedProfessionals />
      <CategoriesSection />
      <ProfessionalCTA />
    </>
  );
};

export default HomePage;
