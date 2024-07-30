import { cva, type VariantProps } from "class-variance-authority";
import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../utils/cn";
import { LoadingSectionspinner } from "./LoadingSpinner";

export const buttonVariants = cva(
	"flex flex-grow-0 items-center z-20 group relative whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium transition-all duration-100 justify-center disabled:opacity-60 disabled:pointer-events-none hover:bg-opacity-80",
	{
		variants: {
			variant: {
				default: "bg-neutral-800 text-white drop-shadow-sm md:drop-shadow-lg",
				secondary: "bg-gray-200 text-gray-700 drop-shadow-sm hover:bg-gray-300",
				outline:
					"bg-white border border-gray-500/20 text-black drop-shadow-sm hover:bg-gray-100",
				ghost: "hover:bg-gray-200/50 bg-transparent text-gray-900",
				destructive: "bg-red-500 hover:bg-red-600 text-white drop-shadow-sm",
			},
			size: {
				default: "h-9 px-4 py-2 text-sm font-normal rounded-xl",
				combobox: "h-9 lg:h-10 xl:h-11 px-4 py-2 text-sm rounded-lg",
				sm: "h-9 px-3 text-xs",
				icon: "h-9 w-9 lg:h-10 lg:w-10 xl:w-10 xl:h-11",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	}
);

export interface ButtonProps
	extends ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{ className, variant, size, children, isLoading = false, ...props },
		ref
	) => {
		return (
			<>
				<button
					ref={ref}
					type="button"
					className={cn(buttonVariants({ variant, size, className }))}
					{...props}
				>
					<div className="relative z-20 flex flex-row items-center">
						{children}
					</div>
					{isLoading && (
						<div className="ml-2 z-20">
							<LoadingSectionspinner
								colorMode={variant === "default" ? "light" : undefined}
								size="xxs"
							/>
						</div>
					)}
				</button>
			</>
		);
	}
);
