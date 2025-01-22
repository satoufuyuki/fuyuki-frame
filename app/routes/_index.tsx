import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Await, Form, useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { count, desc, eq } from "drizzle-orm";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Message } from "~/components/Message";
import { MessageSkeleton } from "~/components/MessageSkeleton";
import { db } from "~/drizzle/config.server";
import { downloads, messages } from "~/drizzle/schema";
import { mc } from "~/utils/mc";

export const meta: MetaFunction = () => {
	return [
		{ title: "Fuyuki Birthday!" },
		{ name: "description", content: "Setup your own avatar frame to participate on Fuyuki's birthday." },
		{ name: "keyword", content: "satou, satou fuyuki, birthday, avatar, frame, twibbon" },
		{ name: "author", content: "knyueki" },
		{ name: "viewport", content: "width=device-width, initial-scale=1" },
		{ name: "og:title", content: "Fuyuki Birthday!" },
		{ name: "og:description", content: "Setup your own avatar frame to participate on Fuyuki's birthday." },
		{ name: "og:type", content: "website" },
		{ name: "og:url", content: "https://fuyuki.kakushin.dev/" },
		{ name: "og:image", content: "https://fuyuki.kakushin.dev/og-image.png" },
		{ name: "og:site_name", content: "Fuyuki Birthday!" },
		{ name: "og:locale", content: "en_US" },
		{ name: "twitter:card", content: "summary_large_image" },
		{ name: "twitter:site", content: "@knyueki" },
		{ name: "twitter:creator", content: "@knyueki" },
		{ name: "twitter:title", content: "Fuyuki Birthday!" },
		{ name: "twitter:description", content: "Setup your own avatar frame to participate on Fuyuki's birthday." },
		{ name: "twitter:image", content: "https://fuyuki.kakushin.dev/og-image.png" },
	];
};

const baseURL = new URL("https://fuyuki.kakushin.dev/");

const maxMessageLength = 400;
const maxNameLength = 50;

export async function loader({ request }: LoaderFunctionArgs) {
	const params = new URL(request.url).searchParams;
	const page = isNaN(Number(params.get("page"))) ? 0 : Number(params.get("page"));
	const [msgs] = await db.select({ size: count(messages.id) }).from(messages).where(eq(messages.isDeleted, false));
	const totalPages = Math.ceil(msgs.size / 10);
	if (page > totalPages) {
		return {
			status: 404,
			error: "Page not found"
		};
	}

	const data = db.select({
		id: messages.id,
		name: messages.name,
		message: messages.message,
		createdAt: messages.createdAt,
		isDeleted: messages.isDeleted
	}).from(messages)
		.where(eq(messages.isDeleted, false))
		.orderBy(desc(messages.createdAt))
		.limit(10)
		.offset((page - 1) * 10);

	const [downloadCount] = await db.select({ size: count(downloads.id) }).from(downloads);
	return {
		data: {
			messages: data.execute(),
			downloadCount: downloadCount.size,
			page,
			totalPages
		}
	}
}
export async function action({
	request
}: ActionFunctionArgs) {
	const formData = await request.formData();
	const name = formData.get("name");
	const message = formData.get("message");

	if (!name) {
		return {
			status: 400,
			data: {
				error: "Name cannot be empty",
			},
		};
	}

	if ((name as string).length > maxNameLength) {
		return {
			status: 400,
			data: {
				error: `Name cannot be more than ${maxNameLength} characters`,
			},
		};
	}

	if (!message) {
		return {
			status: 400,
			data: {
				error: "Message cannot be empty",
			},
		};
	}

	if ((message as string).length > maxMessageLength) {
		return {
			status: 400,
			data: {
				error: `Message cannot be more than ${maxMessageLength} characters`,
			},
		};
	}

	const ip = request.headers.get("cf-connecting-ip") ?? "";
	const userAgent = request.headers.get("user-agent") ?? "";

	console.log("Posting message", { name, message, ip, userAgent });
	// Save to database
	const result = await db.insert(messages).values({
		name: name as string,
		message: message as string,
		senderIp: ip,
		userAgent
	}).returning({
		id: messages.id,
		name: messages.name,
		message: messages.message,
		createdAt: messages.createdAt,
		isDeleted: messages.isDeleted
	});

	return Response.json({
		status: 204,
		message: "Message posted successfully",
		data: result,
	});
}

export default function Index() {
	const navigate = useNavigate();
	const messageData = useLoaderData<typeof loader>();
	console.log(messageData);
	const [isCopying, setIsCopying] = useState(false);
	const onCopy = useCallback(() => {
		if (isCopying) return;
		navigator.clipboard.writeText(baseURL.href);
		setIsCopying(true);
		setTimeout(() => setIsCopying(false), 1000);
	}, [isCopying]);

	// Pagination
	const [currentPage, setCurrentPage] = useState((messageData.data?.page ?? 0));
	useEffect(() => {
		setCurrentPage(messageData.data?.page ?? 0);
	}, [messageData.data?.page]);

	const handlePagination = useCallback((incrementBy: number) => {
		setCurrentPage((p) => p + incrementBy);
	}, []);

	useEffect(() => {
		if (navigate) navigate(`/?page=${currentPage}`);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentPage]);
	// Form
	const fetcher = useFetcher();
	const postModalRef = useRef<HTMLDialogElement | null>(null);
	const [formData, setFormData] = useState({
		name: "",
		message: "",
	});

	const [formErrors, setFormErrors] = useState({
		name: "",
		message: "",
	});

	const handleFormSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (fetcher.state !== "idle") return;
		if (!formData.name) {
			setFormErrors((prev) => ({ ...prev, name: "Name cannot be empty" }));
		} else if (!formData.message) {
			setFormErrors((prev) => ({ ...prev, message: "Message cannot be empty" }));
		} else if (formData.message.length > maxMessageLength) {
			setFormErrors((prev) => ({ ...prev, message: `Message cannot be more than ${maxMessageLength} characters` }));
		} else if (formData.name.length > maxNameLength) {
			setFormErrors((prev) => ({ ...prev, name: `Name cannot be more than ${maxNameLength} characters` }));
		} else {
			postModalRef.current?.showModal();
		}
	}, [formData, fetcher]);

	const handleRealSubmit = useCallback(async () => {
		const data = new FormData();
		data.append("name", formData.name);
		data.append("message", formData.message);
		await fetcher.submit(data, {
			method: "POST"
		});

		postModalRef.current?.close();
	}, [fetcher, formData]);
	// End Form

	const [frameImage, setFrameImage] = useState<HTMLImageElement | null>(null);
	const [userImage, setUserImage] = useState<HTMLImageElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [firstLayerPosition, setFirstLayerPosition] = useState({ x: 0, y: 0 });
	const [secondLayerOpacity, setSecondLayerOpacity] = useState(1);
	const [zoom, setZoom] = useState(1);
	const [imageRotation, setImageRotation] = useState(0);
	const isDragging = useRef(false);
	const dragStart = useRef<{ x: number; y: number; dist?: number }>({ x: 0, y: 0 });
	const movementSensitivityMultiplier = useMemo(() => 1.5, []);
	const tipsModalRef = useRef<HTMLDialogElement | null>(null);

	const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.item(0);
		if (!file) return;
		const image = new Image();
		image.onload = () => {
			setUserImage(image);
		};
		image.src = URL.createObjectURL(file);
		tipsModalRef.current?.showModal();
	}, []);

	const handleDownload = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const a = document.createElement("a");
		a.href = canvas.toDataURL("image/png");
		a.download = "fuyuki-twibbon-avatar.png";
		a.click();

		void fetcher.submit(new FormData(), {
			method: "POST",
			action: "/downloads"
		})
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [canvasRef]);

	useEffect(() => {
		if (!frameImage) {
			const frame = new Image();
			frame.onload = () => {
				setFrameImage(frame);
			};
			frame.src = "/frame.png";
		}
		return () => {
			frameImage?.remove();
		};
	}, [frameImage]);

	const drawCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas || !frameImage) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;


		const drawSecondLayer = () => {
			// Ignore opacity changes if there's no first layer
			if (userImage) ctx.globalAlpha = secondLayerOpacity;
			ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
			ctx.globalAlpha = 1;
		}

		canvas.width = frameImage.naturalWidth;
		canvas.height = frameImage.naturalHeight;

		// Draw the first layer
		if (userImage) {
			ctx.save();
			ctx.translate(canvas.width / 2, canvas.height / 2);
			ctx.rotate((imageRotation * Math.PI) / 180);
			ctx.drawImage(
				userImage,
				-userImage.naturalWidth / 2 + firstLayerPosition.x,
				-userImage.naturalHeight / 2 + firstLayerPosition.y,
				userImage.naturalWidth * zoom,
				userImage.naturalHeight * zoom
			);
			ctx.restore();

			drawSecondLayer();
		} else {
			ctx.fillStyle = "white";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			drawSecondLayer();
		}
	}, [firstLayerPosition, secondLayerOpacity, zoom, frameImage, userImage, imageRotation]);

	const handleRotation = useCallback((incrementBy: number) => {
		setImageRotation((r) => (r + incrementBy) % 360);
	}, []);

	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => drawCanvas(), [zoom, firstLayerPosition, secondLayerOpacity, frameImage, userImage, imageRotation]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const handleDrag = (e: MouseEvent) => {
			if (!isDragging.current) return;
			const angle = (imageRotation * Math.PI) / 180;
			const dx = (e.clientX - dragStart.current.x) * Math.cos(angle) + (e.clientY - dragStart.current.y) * Math.sin(angle);
			const dy = (e.clientY - dragStart.current.y) * Math.cos(angle) - (e.clientX - dragStart.current.x) * Math.sin(angle);
			dragStart.current = { x: e.clientX, y: e.clientY };
			setFirstLayerPosition((pos) => ({ x: pos.x + dx * movementSensitivityMultiplier, y: pos.y + dy * movementSensitivityMultiplier }));
			setSecondLayerOpacity(0.5);
		};

		const handleDragEnd = () => {
			isDragging.current = false;
			setSecondLayerOpacity(1);
		};

		const handleWheel = (e: WheelEvent) => {
			if (!e.ctrlKey) return;
			e.preventDefault();
			const delta = -e.deltaY / 500;
			setZoom((z) => Math.min(Math.max(0.5, z + delta), 2));
			setSecondLayerOpacity(0.5);
			setTimeout(() => setSecondLayerOpacity(1), 200);
		};

		const handlePointerDown = (e: MouseEvent) => {
			isDragging.current = true;
			dragStart.current = { x: e.clientX, y: e.clientY };
		};

		const handleTouchMove = (e: TouchEvent) => {
			if (e.touches.length === 2) {
				e.preventDefault();
				const touch1 = e.touches[0];
				const touch2 = e.touches[1];
				const dist = Math.hypot(
					touch2.clientX - touch1.clientX,
					touch2.clientY - touch1.clientY
				);

				if (!dragStart.current.dist) {
					dragStart.current.dist = dist;
					return;
				}
				const scaleChange = dist - dragStart.current.dist;
				dragStart.current.dist = dist;
				setZoom((z) => Math.min(Math.max(0.5, z + scaleChange / 200), 2));
				setSecondLayerOpacity(0.5);
			} else if (e.touches.length === 1) {
				if (!isDragging.current) return;
				e.preventDefault();
				const touch = e.touches[0];
				const angle = (imageRotation * Math.PI) / 180;
				const dx = (touch.clientX - dragStart.current.x) * Math.cos(angle) + (touch.clientY - dragStart.current.y) * Math.sin(angle);
				const dy = (touch.clientY - dragStart.current.y) * Math.cos(angle) - (touch.clientX - dragStart.current.x) * Math.sin(angle);
				dragStart.current = { x: touch.clientX, y: touch.clientY };
				setFirstLayerPosition((pos) => ({ x: pos.x + dx * movementSensitivityMultiplier, y: pos.y + dy * movementSensitivityMultiplier }));
				setSecondLayerOpacity(0.5);
			}
		}


		const handleTouchStart = (e: TouchEvent) => {
			if (e.touches.length === 1) {
				const touch = e.touches[0];
				isDragging.current = true;
				dragStart.current = { x: touch.clientX, y: touch.clientY };
			}
		}

		canvas.addEventListener("mousedown", handlePointerDown);
		canvas.addEventListener("mousemove", handleDrag);
		canvas.addEventListener("mouseup", handleDragEnd);
		canvas.addEventListener("wheel", handleWheel);
		canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
		canvas.addEventListener("touchstart", handleTouchStart);
		canvas.addEventListener("touchend", handleDragEnd);

		return () => {
			canvas.removeEventListener("mousedown", handlePointerDown);
			canvas.removeEventListener("mousemove", handleDrag);
			canvas.removeEventListener("mouseup", handleDragEnd);
			canvas.removeEventListener("wheel", handleWheel);
			canvas.removeEventListener("touchmove", handleTouchMove);
			canvas.removeEventListener("touchstart", handleTouchStart);
			canvas.removeEventListener("touchend", handleDragEnd);
		};
	}, [imageRotation, firstLayerPosition, movementSensitivityMultiplier]);


	return (
		<section className="w-full pt-16 px-4 md:px-0">
			<dialog ref={tipsModalRef} className="modal">
				<div className="modal-box">
					<h3 className="font-bold text-lg">Tips</h3>
					<p className="py-4 block md:hidden">Start dragging or pinching on the picture to adjust the image&apos;s position</p>
					<p className="py-4 hidden md:block">Start dragging or <kbd className="kbd">CTRL</kbd> + <kbd className="kbd">Scroll</kbd> on the picture to adjust the image&apos;s position</p>
					<div className="modal-action">
						<form method="dialog">
							<button className="btn btn-success text-white">Understood</button>
						</form>
					</div>
				</div>
			</dialog>
			<dialog ref={postModalRef} className="modal">
				<div className="modal-box">
					<h3 className="font-bold text-lg">Confirmation</h3>
					<p className="py-4">Are you sure want to post this:</p>
					<p>Message: {formData.message}</p>
					<p>By: {formData.name}</p>
					<p className="py-4">Please be polite and respectful when posting message unless you want to get blocked from this page.</p>
					<div className="modal-action">
						<form method="dialog" className="flex gap-4">
							<button disabled={fetcher.state === "submitting"} className="btn btn-ghost">Cancel</button>
							<button onClick={() => handleRealSubmit()} disabled={fetcher.state === "submitting"} className="btn btn-success text-white">{fetcher.state === "submitting" ? "Loading..." : "Yes, proceed."}</button>
						</form>
					</div>
				</div>
			</dialog>
			<div className="container m-auto w-fit">
				<section className="w-full">
					<main className="flex p-8 bg-neutral-100 rounded-xl border-[1px] border-gray-200 shadow gap-8 flex-col md:flex-row">
						<aside>
							<canvas ref={canvasRef} className="aspect-square size-80 md:size-96 mx-auto" />
							<div className={mc("grid grid-rows-2 grid-cols-1 gap-y-3 flex-col mt-4", {
								"grid-rows-1": !userImage
							})}>
								{userImage && <button onClick={handleDownload} className="btn btn-primary w-80 mx-auto md:w-full text-white"><img src="/download-white.svg" className="stroke-white" alt="Download Icon"></img> Download</button>}
								<input
									type="file"
									accept="image/png, image/jpeg, image/webp"
									onChange={handleFileChange}
									className="file-input file-input-bordered file-input-secondary w-80 mx-auto md:w-full" />
								{userImage &&
									<div className="flex gap-x-2 items-center justify-center">
										<button onClick={() => handleRotation(-90)} className="btn btn-neutral">
											<img src="/rotate.svg" alt="Rotate" className="size-6 aspect-square" />
										</button>
										<button onClick={() => handleRotation(90)} className="btn btn-neutral">
											<img src="/rotate-2.svg" alt="Rotate" className="size-6 aspect-square" />
										</button>
									</div>
								}
							</div>
						</aside>
						<div className="space-y-2">
							<h1 className="text-xl font-semibold">Satou Fuyuki&apos;s Day!</h1>
							<p className="inline-flex items-center gap-x-1 text-sm text-gray-500"><span><img src="/download.svg" alt="Download Icon" className="size-5"></img></span> {messageData.data?.downloadCount.toLocaleString()} downloads</p>

							<p className="flex items-center gap-x-1 text-md text-blue-500 font-bold">
								<img src="/link.svg" alt="URL Icon" className="size-5"></img>
								<span className="text-blue-400"><a href={baseURL.href}>{baseURL.hostname}</a></span>
								<button className={
									mc("btn btn-neutral btn-xs", {
										"btn-success text-white": isCopying
									})
								} onClick={onCopy}>
									{isCopying ? "copied" : "copy link"}
								</button>
							</p>

							<Form method="POST" onSubmit={handleFormSubmit} className="pt-6">
								<p>...also wish him something!</p>

								{/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
								<label className="form-control w-full">
									<div className="label">
										<span className="label-text text-lg font-medium">Your Name</span>
									</div>
									<input
										onChange={(e) => {
											setFormData(prev => ({ ...prev, name: e.target.value }));
											setFormErrors(prev => ({ ...prev, name: "" }));
										}}
										value={formData.name}
										placeholder="Skylar"
										className={mc("input input-bordered w-full", {
											"input-error": formErrors.name !== ""
										})} />
									<div className="label">
										{formErrors.name && <span className="label-text-alt text-red-500">{formErrors.name}</span>}
									</div>
								</label>

								{/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
								<label className="form-control w-full">
									<div className="label">
										<span className="label-text text-lg font-medium">Wish Fuyuki Something!</span>
									</div>
									<textarea
										onChange={(e) => {
											setFormData(prev => ({ ...prev, message: e.target.value }));
											setFormErrors(prev => ({ ...prev, message: "" }));
										}}
										value={formData.message}
										placeholder="Write a message for him"
										className={mc("textarea textarea-bordered w-full resize-none h-32", {
											"textarea-error": formErrors.message !== "" || formData.message.length > maxMessageLength
										})} />
									<div className="label">
										{formErrors.message && <span className="label-text-alt text-red-500">{formErrors.message}</span>}
										{!formErrors.message && <span className={mc("label-text-alt text-gray-400", {
											"text-red-500": formData.message.length > maxMessageLength
										})}>{maxMessageLength - formData.message.length}</span>}
									</div>
								</label>

								<button type="submit" className="btn btn-info text-white w-full mt-4"><img src="/send.svg" alt="Send Icon"></img> Send</button>
							</Form>
						</div>
					</main>

					<section id="messages" className="max-w-3xl px-8 md:p-0">
						<h2 className="text-xl font-semibold mt-8">Messages</h2>
						<main className="grid grid-cols-1 gap-4 mt-4">
							<Suspense fallback={
								new Array(5).fill(0).map((_, i) => (
									<MessageSkeleton key={i} />
								))
							}>
								<Await resolve={messageData.data?.messages}>
									{(msgs) => msgs?.length === 0 ? <p className="text-gray-400">No messages yet</p>
										: <>
											{msgs?.map((msg) => (<Message key={msg.id} name={msg.name} message={msg.message} createdAt={msg.createdAt} />))}
											<div className="join mx-auto">
												<button onClick={() => handlePagination(-1)} disabled={currentPage === 0} className="join-item btn">«</button>
												<button className="join-item btn">Page {currentPage + 1}</button>
												<button onClick={() => handlePagination(1)} disabled={currentPage + 1 === messageData.data?.totalPages} className="join-item btn">»</button>
											</div>
										</>}
								</Await>
							</Suspense>
						</main>
					</section>
					<footer className="flex items-center justify-center my-12 flex-col gap-y-2">
						<p>Made with ❤ by <span className="text-blue-400"><a href="https://x.com/knyueki" rel="noreferrer" target="_blank">@knyueki</a></span></p>
						<p>Written in <span className="text-blue-400"><a href="https://remix.run/" rel="noreferrer" target="_blank">Remix</a></span> | <span className="text-blue-400"><a href="https://github.com/satoufuyuki/fuyuki-frame" rel="noreferrer" target="_blank">Source Code</a></span></p>
					</footer>
				</section>
			</div>
		</section>
	);
}
