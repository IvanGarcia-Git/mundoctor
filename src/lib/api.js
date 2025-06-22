import { supabase } from './supabase';

// Appointments
export const getAppointments = async (userId, role) => {
  const query = supabase
    .from('appointments')
    .select(`
      *,
      patient:patient_id (id, first_name, last_name, email),
      professional:professional_id (id, first_name, last_name, email, specialty)
    `)
    .order('date', { ascending: true });

  // Filter based on role
  if (role === 'patient') {
    query.eq('patient_id', userId);
  } else if (role === 'professional') {
    query.eq('professional_id', userId);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Format appointments for calendar view
  return data.map(appointment => ({
    id: appointment.id,
    date: appointment.date,
    patientId: appointment.patient_id,
    patientName: `${appointment.patient.first_name} ${appointment.patient.last_name}`,
    type: appointment.appointment_type || 'GENERAL',
    status: appointment.status,
    duration: appointment.duration || 30,
    notes: appointment.notes,
    symptoms: appointment.symptoms,
    diagnosis: appointment.diagnosis,
    prescription: appointment.prescription
  }));
};

export const createAppointment = async (appointmentData) => {
  const { data, error } = await supabase
    .from('appointments')
    .insert([appointmentData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateAppointment = async (id, updates) => {
  const { data, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteAppointment = async (id) => {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Specialties
export const getSpecialties = async () => {
  const { data, error } = await supabase
    .from('specialties')
    .select('*')
    .order('name');

  if (error) throw error;
  return data;
};

// Professionals
export const getProfessionals = async (options = {}) => {
  let query = supabase
    .from('profiles')
    .select(`
      *,
      ratings (
        rating
      )
    `)
    .eq('role', 'professional');

  if (options.specialty) {
    query = query.eq('specialty', options.specialty);
  }

  if (options.search) {
    query = query.or(`first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%`);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  
  // Calculate average rating for each professional
  return data.map(professional => ({
    ...professional,
    averageRating: professional.ratings?.length > 0
      ? professional.ratings.reduce((acc, curr) => acc + curr.rating, 0) / professional.ratings.length
      : null
  }));
};

// Ratings
export const createRating = async (ratingData) => {
  const { data, error } = await supabase
    .from('ratings')
    .insert([ratingData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getProfessionalRatings = async (professionalId) => {
  const { data, error } = await supabase
    .from('ratings')
    .select(`
      *,
      patient:patient_id (first_name, last_name)
    `)
    .eq('professional_id', professionalId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

// Profile Management
export const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Storage helpers for avatar uploads
export const uploadAvatar = async (userId, file) => {
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}/avatar.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  // Update profile with new avatar URL
  await updateProfile(userId, { avatar_url: publicUrl });

  return publicUrl;
};
