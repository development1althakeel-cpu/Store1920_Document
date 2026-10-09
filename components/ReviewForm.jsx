'use client'
import { useState, useEffect, useRef } from "react"

import { Camera, StarIcon } from "lucide-react"
import Image from "next/image"
import axios from "axios"
import { toast } from "react-hot-toast"
import { useRouter } from "next/navigation"

import { auth } from '../lib/firebase';
import { useNavbarColor } from '@/lib/useNavbarColor';
export default function ReviewForm({
  productId,
  onReviewAdded,
  onCancel,
  startOpen = false,
  submitDisabled = false,
  statusMessage = '',
  hideCancel = false,
}) {
    const [user, setUser] = useState(null);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [getToken, setGetToken] = useState(() => async () => null);
    const router = useRouter();
    const navbarColor = useNavbarColor();
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
            setUser(firebaseUser);
            setIsSignedIn(!!firebaseUser);
            setGetToken(() => async () => firebaseUser ? firebaseUser.getIdToken() : null);
        });
        return () => unsubscribe();
    }, []);

    const [showForm, setShowForm] = useState(startOpen)
    const [rating, setRating] = useState(5)
    const [review, setReview] = useState('')
    const [images, setImages] = useState([])
    const [imagePreviews, setImagePreviews] = useState([])
    const [submitting, setSubmitting] = useState(false)
    const fileInputRef = useRef(null)
    const cameraInputRef = useRef(null)

    useEffect(() => {
        setShowForm(startOpen)
    }, [startOpen, productId])

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files)
        const remainingSlots = 5 - images.length
        
        if (remainingSlots <= 0) {
            toast.error('Maximum 5 images allowed')
            e.target.value = ''
            return
        }
        
        const filesToAdd = files.slice(0, remainingSlots)
        if (files.length > remainingSlots) {
            toast.error(`Only ${remainingSlots} more image${remainingSlots !== 1 ? 's' : ''} can be added (max 5 total)`)
        }
        
        setImages([...images, ...filesToAdd])
        
        // Create previews
        const previews = filesToAdd.map(file => URL.createObjectURL(file))
        setImagePreviews([...imagePreviews, ...previews])
        
        e.target.value = ''
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (submitDisabled) {
            if (statusMessage) toast.error(statusMessage)
            return
        }

        if (!isSignedIn) {
            toast.error('Please sign in to write a review')
            router.push('/sign-in')
            return
        }

        if (!review.trim()) {
            toast.error('Please write a review')
            return
        }

        if (!productId) {
            toast.error('Product ID missing. Cannot submit review.')
            return
        }

        try {
            setSubmitting(true)
            const formData = new FormData()
            formData.append('productId', productId)
            formData.append('rating', rating)
            formData.append('review', review)

            images.forEach(img => {
                formData.append('images', img)
            })

            const token = await getToken()
            const { data } = await axios.post('/api/review', formData, {
                headers: { Authorization: `Bearer ${token}` }
            })
            /*...existing code...*/
            toast.success('Review submitted! Pending approval by store.')
            setShowForm(false)
            setRating(5)
            setReview('')
            setImages([])
            setImagePreviews([])
            
            if (onReviewAdded) {
                onReviewAdded(data.review)
            }
            onCancel?.()
        } catch (error) {
            toast.error(error?.response?.data?.error || 'Failed to submit review')
        } finally {
            setSubmitting(false)
        }
    }

    if (!showForm) {
        if (!isSignedIn) return null;
        return (
            <div className="flex items-center justify-center gap-2">
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => {
                                setRating(star)
                                setShowForm(true)
                            }}
                            className="transition hover:scale-110"
                        >
                            <StarIcon
                                size={32}
                                fill="#D1D5DB"
                                className="text-transparent cursor-pointer hover:fill-yellow-400"
                            />
                        </button>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="pt-1">
            {statusMessage ? (
              <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] leading-5 text-amber-900">
                {statusMessage}
              </p>
            ) : null}
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Rating */}
                <div>
                    <label className="block text-sm font-medium mb-2">Your Rating *</label>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className="transition hover:scale-110"
                            >
                                <StarIcon
                                    size={32}
                                    fill={rating >= star ? "#FFA500" : "#D1D5DB"}
                                    className="text-transparent cursor-pointer"
                                />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Review Text */}
                <div>
                    <label className="block text-sm font-medium mb-2">Your Review *</label>
                    <textarea
                        required
                        value={review}
                        onChange={(e) => setReview(e.target.value)}
                        rows={5}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Share your thoughts about this product..."
                    />
                </div>

                {/* Image Upload */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Add Photos (Optional)
                    </label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                        className="sr-only"
                        disabled={images.length >= 5}
                    />
                    <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageChange}
                        className="sr-only"
                        disabled={images.length >= 5}
                    />
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={images.length >= 5}
                            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Choose file
                        </button>
                        <button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            disabled={images.length >= 5}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 lg:hidden"
                        >
                            <Camera size={16} />
                            Camera
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        You can upload up to 5 photos ({images.length}/5)
                    </p>
                    
                    {/* Image Previews */}
                    {imagePreviews.length > 0 && (
                        <div className="flex gap-3 mt-3 flex-wrap">
                            {imagePreviews.map((preview, idx) => (
                                <div key={idx} className="relative">
                                    <Image
                                        src={preview}
                                        alt={`Preview ${idx + 1}`}
                                        width={100}
                                        height={100}
                                        className="rounded-lg object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setImages(images.filter((_, i) => i !== idx))
                                            setImagePreviews(imagePreviews.filter((_, i) => i !== idx))
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={submitting || submitDisabled}
                        className="px-6 py-2.5 text-white text-sm font-medium rounded transition hover:brightness-95 disabled:cursor-not-allowed disabled:bg-gray-400"
                        style={submitting || submitDisabled ? undefined : { backgroundColor: navbarColor }}
                    >
                        {submitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                    {!hideCancel ? (
                    <button
                        type="button"
                        onClick={() => {
                            setShowForm(false)
                            setRating(5)
                            setReview('')
                            setImages([])
                            setImagePreviews([])
                            onCancel?.()
                        }}
                        className="px-6 py-2.5 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300 transition"
                    >
                        Cancel
                    </button>
                    ) : null}
                </div>
            </form>
        </div>
    )
}
