import {
	Toast,
	ToastClose,
	ToastDescription,
	ToastProvider,
	ToastTitle,
	ToastViewport,
} from '@/components/ui/toast';
import { useToast } from '@/components/ui/use-toast';
import React from 'react';

export function Toaster() {
	const { toasts } = useToast();

	return (
		<ToastProvider>
			{toasts.map(({ id, title, description, action, onDismiss, ...props }) => {
				// Filtrar props que no deben llegar al DOM
				const { dismiss, ...safeProps } = props;
				return (
					<Toast key={id} {...safeProps}>
						<div className="grid gap-1">
							{title && <ToastTitle>{title}</ToastTitle>}
							{description && (
								<ToastDescription>{description}</ToastDescription>
							)}
						</div>
						{action}
						<ToastClose onClick={onDismiss} />
					</Toast>
				);
			})}
			<ToastViewport />
		</ToastProvider>
	);
}
