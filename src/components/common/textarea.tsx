// import React, { useState } from "react";

// interface TextareaCommonProps
//   extends React.DetailedHTMLProps<
//     React.TextareaHTMLAttributes<HTMLTextAreaElement>,
//     HTMLTextAreaElement
//   > {
//   label?: string;
//   error?: string;
//   helperText?: string;
// }

// const TextAreaCommon: React.FC<TextareaCommonProps> = ({
//   label,
//   error,
//   helperText,
//   className = "",
//   rows = 5,
//   placeholder = "พิมพ์ข้อความที่นี่",
//   ...props
// }) => {
//   const [isFocused, setIsFocused] = useState(false);

//   return (
//     <div className="flex flex-col gap-1.5">
//       {label && (
//         <label className="text-sm font-medium text-gray-700">{label}</label>
//       )}
//       <div className="relative">
//         <textarea
//           {...props}
//           rows={rows}
//           placeholder={placeholder}
//           className={`
//             w-full
//             px-4 
//             py-3
//             bg-white
//             border
//             rounded-lg
//             outline-none
//             resize-y
//             min-h-[120px]
//             text-base
//             ${isFocused 
//               ? 'border-blue-500 ring-2 ring-blue-100' 
//               : 'border-gray-200 hover:border-gray-300'
//             }
//             ${error 
//               ? 'border-red-500 ring-2 ring-red-100' 
//               : ''
//             }
//             transition-all
//             duration-200
//             placeholder:text-gray-400
//             text-gray-700
//             ${className}
//           `}
//           onFocus={(e) => {
//             setIsFocused(true);
//             props.onFocus?.(e);
//           }}
//           onBlur={(e) => {
//             setIsFocused(false);
//             props.onBlur?.(e);
//           }}
//         />
//       </div>
//       {error && (
//         <span className="text-sm text-red-500">{error}</span>
//       )}
//       {helperText && !error && (
//         <span className="text-sm text-gray-500">{helperText}</span>
//       )}
//     </div>
//   );
// };

// export default TextAreaCommon;