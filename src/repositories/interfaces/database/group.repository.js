 class IGroupRepository {
    async create(data) { throw new Error("Method not implemented."); }
    async findById(groupId) { throw new Error("Method not implemented."); }
    async findByUserId(userId) { throw new Error("Method not implemented."); }
    async addMember(groupId, userId) { throw new Error("Method not implemented."); }
    async removeMember(groupId, userId) { throw new Error("Method not implemented."); }
    async isMember(groupId, userId) { throw new Error("Method not implemented."); }
}

export default IGroupRepository;