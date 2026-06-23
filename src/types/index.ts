export interface Category {
  _id?: string;
  id: string;
  name: string;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MenuItem {
  _id?: string;
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  hasImage: boolean;
  type: 'veg' | 'non-veg';
  popular: boolean;
  available: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Restaurant {
  _id?: string;
  name: string;
  tagline: string;
  logo: string;
  heroImage: string;
  phone: string;
  email: string;
  location: string;
  about: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
}

export interface Admin {
  _id?: string;
  username: string;
  password: string;
  createdAt?: Date;
}

export interface MenuFilters {
  search: string;
  category: string;
  type: 'all' | 'veg' | 'non-veg';
  showOnlyPopular: boolean;
}
