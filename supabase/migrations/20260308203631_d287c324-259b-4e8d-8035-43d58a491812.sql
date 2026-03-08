
ALTER TABLE public.feedbacks ADD COLUMN status TEXT NOT NULL DEFAULT 'new';

CREATE POLICY "Admins can update feedback"
  ON public.feedbacks FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete feedback"
  ON public.feedbacks FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
