/*
 * The users reducer will always return an array of users no matter what
 * You need to return something, so if there are no users then just return an empty array
 * */

export default function () {
    return [
        {
            id: 1,
            first: "Tony",
            last: "Stark",
            age: 53,
            description: "Is known as the Iron Man Superhero.",
            thumbnail: "http://i.imgur.com/lKwTiEA.gif"
        },
        {
            id: 2,
            first: "Loki",
            last: "",
            age: 54,
            description: "Thor's adoptive brother and nemesis.",
            thumbnail: "https://i.imgur.com/bDM22L4.gif"
        },
        {
            id: 3,
            first: "Steve",
            last: "Rogers",
            age: 98,
            description: "Is known as the world's first superhero.",
            thumbnail: "https://i.imgur.com/LUtj5iZ.gif"
        }
    ]
}
