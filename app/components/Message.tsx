import moment from "moment";

export function Message({ name, message, createdAt }: { name: string, message: string, createdAt: string }) {
  return (
    <div className="flex gap-4">
      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`} alt={name} className="aspect-square size-12 md:size-16 rounded-full" />
      <div>
        <h3 className="font-bold">{name}</h3>
        {/* timestamp */}
        <p className="text-gray-400">{moment(new Date(createdAt)).format("DD MMMM YYYY, hh:mm")}</p>
        <p className="text-gray-500 text-justify">{message}</p>
      </div>
    </div>
  )   
}