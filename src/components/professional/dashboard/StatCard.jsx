
import React from 'react';
import { CalendarDays, MessageSquare, UserCircle, CreditCard } from 'lucide-react';

const iconMap = {
  CalendarDays: CalendarDays,
  MessageSquare: MessageSquare,
  UserCircle: UserCircle,
  CreditCard: CreditCard,
};

const colorMap = {
    blue: "text-blue-500",
    green: "text-green-500",
    purple: "text-purple-500",
    yellow: "text-yellow-500",
};

const StatCard = ({ title, value, iconName, iconColor }) => {
  const IconComponent = iconMap[iconName] || CalendarDays; 
  const textColorClass = colorMap[iconColor] || "text-primary";

  return (
    <div className="bg-card dark:bg-gray-800/60 backdrop-blur-md p-6 rounded-xl border border-border dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-shadow">
      <div className={`p-3 inline-block bg-primary/10 dark:bg-blue-500/20 rounded-lg mb-3`}>
        <IconComponent size={28} className={textColorClass} />
      </div>
      <h3 className="text-2xl font-bold text-foreground dark:text-white mb-1">{value}</h3>
      <p className="text-sm text-muted-foreground dark:text-gray-400">{title}</p>
    </div>
  );
};

export default StatCard;
