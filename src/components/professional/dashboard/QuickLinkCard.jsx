
import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Users, MessageSquare, UserCircle, CreditCard, BarChart2, Settings } from 'lucide-react';

const iconMap = {
  CalendarDays: CalendarDays,
  Users: Users,
  MessageSquare: MessageSquare,
  UserCircle: UserCircle,
  CreditCard: CreditCard,
  BarChart2: BarChart2,
  Settings: Settings,
};

const QuickLinkCard = ({ name, path, iconName }) => {
  const IconComponent = iconMap[iconName] || CalendarDays;

  return (
    <Link 
      to={path} 
      className="bg-card dark:bg-gray-800/60 backdrop-blur-md p-5 rounded-lg border border-border dark:border-gray-700/50 shadow-md hover:border-primary dark:hover:border-blue-500 transition-colors flex flex-col items-center text-center space-y-2"
    >
      <IconComponent size={28} className="text-primary dark:text-blue-400 mb-1" />
      <span className="text-foreground dark:text-white font-medium text-sm">{name}</span>
    </Link>
  );
};

export default QuickLinkCard;
