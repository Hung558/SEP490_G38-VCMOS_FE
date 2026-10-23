Cách dùng:

import {storage, getStorage, setStorage, getSession } from "@/utils/storage"

type User = { id: string; name: string }

// Lưu
setStorage(STORAGE.USER_INFO, { id: "1", name: "Cong Vu" })

// Lấy
const user = getStorage<User>(STORAGE.USER_INFO)

// Lưu vào sessionStorage
setSession("tempData", { foo: "bar" })

// Xóa token
deleteStorage(STORAGE.TOKEN)
